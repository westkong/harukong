-- =============================================
-- 글 올릴 때마다 스트릭 자동 갱신 트리거
-- =============================================

create or replace function public.update_streak_on_post()
returns trigger language plpgsql security definer as $$
declare
  last_date date;
  current_streak int;
begin
  select last_posted_at, streak
    into last_date, current_streak
  from public.users
  where id = new.user_id;

  if last_date is null then
    -- 첫 글
    update public.users
    set streak = 1, last_posted_at = new.posted_date
    where id = new.user_id;

  elsif new.posted_date = last_date then
    -- 같은 날 (수정 등) — 변경 없음
    return new;

  elsif new.posted_date = last_date + 1 then
    -- 연속 유지 (어제 → 오늘)
    update public.users
    set streak = coalesce(current_streak, 0) + 1,
        last_posted_at = new.posted_date
    where id = new.user_id;

  else
    -- 끊김 (이틀 이상 텀) → 다시 1부터
    update public.users
    set streak = 1, last_posted_at = new.posted_date
    where id = new.user_id;
  end if;

  return new;
end;
$$;

create or replace trigger on_post_created_update_streak
  after insert on public.posts
  for each row execute function public.update_streak_on_post();
