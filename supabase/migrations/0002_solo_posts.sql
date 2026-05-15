-- =============================================
-- 그룹 없이 혼자 쓰는 게시물도 가능하게 RLS 추가
-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run
-- =============================================

-- 본인 게시물은 그룹 유무 상관없이 항상 읽기 가능
create policy "게시물 읽기 — 본인" on public.posts
  for select using (user_id = auth.uid());

-- 본인 반응은 항상 읽기 가능
create policy "반응 읽기 — 본인" on public.reactions
  for select using (user_id = auth.uid());
