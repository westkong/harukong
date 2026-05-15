-- =============================================
-- post_groups ↔ posts 무한 재귀 정책 수정
-- 같은 방식: SECURITY DEFINER 함수로 RLS 우회
-- =============================================

-- 헬퍼 함수 1: 이 게시물이 내가 속한 그룹에 공유됐는가?
create or replace function public.post_is_shared_to_my_group(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.post_groups pg
    join public.group_members gm on gm.group_id = pg.group_id
    where pg.post_id = p_id and gm.user_id = auth.uid()
  );
$$;

-- 헬퍼 함수 2: 이 게시물의 작성자가 나인가?
create or replace function public.is_post_owner(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.posts where id = p_id and user_id = auth.uid()
  );
$$;


-- posts 정책 — 헬퍼 함수 사용으로 재귀 제거
drop policy if exists "게시물 읽기 — 본인 또는 공유받음" on public.posts;
create policy "게시물 읽기 — 본인 또는 공유받음" on public.posts
  for select using (
    user_id = auth.uid() or public.post_is_shared_to_my_group(id)
  );


-- post_groups 정책 — 헬퍼 함수 사용
drop policy if exists "공유 읽기 — 그룹원 또는 작성자" on public.post_groups;
drop policy if exists "공유 추가 — 작성자만"          on public.post_groups;
drop policy if exists "공유 삭제 — 작성자만"          on public.post_groups;

create policy "공유 읽기" on public.post_groups
  for select using (
    public.is_group_member(group_id) or public.is_post_owner(post_id)
  );

create policy "공유 추가 — 작성자만" on public.post_groups
  for insert with check (public.is_post_owner(post_id));

create policy "공유 삭제 — 작성자만" on public.post_groups
  for delete using (public.is_post_owner(post_id));


-- reactions 정책도 같은 방식으로 정리
drop policy if exists "반응 읽기 — 본인 또는 그룹원" on public.reactions;
create policy "반응 읽기 — 본인 또는 그룹원" on public.reactions
  for select using (
    user_id = auth.uid() or public.post_is_shared_to_my_group(post_id)
  );
