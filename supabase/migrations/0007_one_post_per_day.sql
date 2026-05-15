-- =============================================
-- 하루 1글로 변경 (그룹 무관)
-- 기존: 그룹별로 1글 가능 → 새: 하루 한 군데에만 1글
-- =============================================

drop index if exists posts_one_per_day;

create unique index posts_one_per_day
  on public.posts (user_id, posted_date);
