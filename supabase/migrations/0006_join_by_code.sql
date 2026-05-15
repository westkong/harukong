-- =============================================
-- 초대 코드로 그룹 가입 함수
-- RLS 우회 — 코드를 알면 가입 가능, 단 가입 후에만 그룹 정보 접근 가능
-- =============================================

create or replace function public.join_group_by_code(code text)
returns table(group_id uuid, group_name text)
language plpgsql security definer as $$
declare
  g_id   uuid;
  g_name text;
begin
  -- 1. 코드로 그룹 찾기 (RLS 우회)
  select id, name into g_id, g_name
  from public.groups
  where invite_code = upper(code);

  if g_id is null then
    raise exception '초대 코드를 찾을 수 없어요';
  end if;

  -- 2. 이미 멤버인지 확인
  if exists (
    select 1 from public.group_members
    where group_members.group_id = g_id and user_id = auth.uid()
  ) then
    raise exception '이미 가입된 그룹이에요';
  end if;

  -- 3. 멤버로 추가
  insert into public.group_members (group_id, user_id)
  values (g_id, auth.uid());

  return query select g_id, g_name;
end;
$$;
