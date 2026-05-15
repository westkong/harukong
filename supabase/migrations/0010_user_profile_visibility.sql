-- =============================================
-- 같은 그룹 멤버끼리 닉네임/아바타 읽기 가능
-- =============================================

-- 헬퍼: target_user와 내가 같은 그룹에 속해있나?
create or replace function public.shares_group_with(target_user uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = target_user
  );
$$;

-- 기존 정책 정리 (for all 였음)
drop policy if exists "유저 본인 수정" on public.users;

-- select: 본인 또는 같은 그룹원
create policy "프로필 읽기 — 본인 또는 그룹원" on public.users
  for select using (
    auth.uid() = id or public.shares_group_with(id)
  );

-- insert/update/delete: 본인만
create policy "프로필 추가 — 본인" on public.users
  for insert with check (auth.uid() = id);

create policy "프로필 수정 — 본인" on public.users
  for update using (auth.uid() = id);

create policy "프로필 삭제 — 본인" on public.users
  for delete using (auth.uid() = id);
