-- =============================================
-- 한 글을 여러 그룹에 동시 공유 가능하게
-- posts.group_id 1개 → post_groups (글 ↔ 그룹 N:M 매핑)
-- =============================================

-- 1. 매핑 테이블 신규 생성
create table if not exists public.post_groups (
  post_id  uuid references public.posts(id)  on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  primary key (post_id, group_id)
);

alter table public.post_groups enable row level security;

-- 2. 기존 데이터 이전 (group_id가 채워진 게시물 → 매핑 row 생성)
insert into public.post_groups (post_id, group_id)
select id, group_id from public.posts where group_id is not null
on conflict do nothing;

-- 3. posts 정책 정리 후 새로 만들기
drop policy if exists "게시물 읽기 — 그룹원" on public.posts;
drop policy if exists "게시물 읽기 — 본인" on public.posts;

create policy "게시물 읽기 — 본인 또는 공유받음" on public.posts
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.post_groups pg
      where pg.post_id = posts.id and public.is_group_member(pg.group_id)
    )
  );

-- 4. post_groups 정책
create policy "공유 읽기 — 그룹원 또는 작성자" on public.post_groups
  for select using (
    public.is_group_member(group_id) or
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

create policy "공유 추가 — 작성자만" on public.post_groups
  for insert with check (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

create policy "공유 삭제 — 작성자만" on public.post_groups
  for delete using (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

-- 5. reactions 정책도 posts.group_id 참조 → post_groups 기반으로 갱신
drop policy if exists "반응 읽기 — 그룹원" on public.reactions;
drop policy if exists "반응 읽기 — 본인"   on public.reactions;

create policy "반응 읽기 — 본인 또는 그룹원" on public.reactions
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.post_groups pg
      where pg.post_id = reactions.post_id
        and public.is_group_member(pg.group_id)
    )
  );

-- 6. posts.group_id 컬럼 제거 (이제 post_groups가 대신함)
alter table public.posts drop column if exists group_id;
