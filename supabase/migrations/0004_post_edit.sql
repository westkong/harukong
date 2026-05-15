-- =============================================
-- 게시물 수정 기능 (하루 1번만)
-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run
-- =============================================

-- edited_at: 수정한 시각. null이면 아직 수정 안 함, 값 있으면 잠김.
alter table public.posts
  add column if not exists edited_at timestamptz;

-- 본인 게시물만 수정 가능 (수정 횟수 체크는 클라이언트에서)
create policy "게시물 수정 — 본인 1회" on public.posts
  for update using (user_id = auth.uid() and edited_at is null)
  with check (user_id = auth.uid());
