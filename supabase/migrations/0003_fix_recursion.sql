-- =============================================
-- group_members 무한 재귀 정책 수정
-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run
-- =============================================

-- 기존 문제 정책 제거
drop policy if exists "멤버 읽기"          on public.group_members;
drop policy if exists "그룹 읽기 — 멤버만" on public.groups;
drop policy if exists "게시물 읽기 — 그룹원" on public.posts;
drop policy if exists "반응 읽기 — 그룹원"   on public.reactions;

-- "내가 이 그룹의 멤버인가?" 를 안전하게 검사하는 함수
-- SECURITY DEFINER = 함수 실행 시 RLS 우회 (재귀 방지)
create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = g and user_id = auth.uid()
  );
$$;

-- group_members: 본인 row + 같은 그룹의 다른 멤버
create policy "멤버 읽기" on public.group_members
  for select using (
    user_id = auth.uid() or public.is_group_member(group_id)
  );

-- groups: 멤버인 그룹만 읽기
create policy "그룹 읽기 — 멤버만" on public.groups
  for select using (public.is_group_member(id));

-- posts: 같은 그룹원이면 읽기
create policy "게시물 읽기 — 그룹원" on public.posts
  for select using (
    group_id is not null and public.is_group_member(group_id)
  );

-- reactions: 게시물 그룹원이면 읽기
create policy "반응 읽기 — 그룹원" on public.reactions
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = reactions.post_id
        and p.group_id is not null
        and public.is_group_member(p.group_id)
    )
  );
