-- =============================================
-- 그룹 만들면 만든 사람을 자동으로 멤버로 등록
-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run
-- =============================================

create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace trigger on_group_created
  after insert on public.groups
  for each row execute function public.add_owner_as_member();
