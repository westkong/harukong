// Anthropic 키를 클라이언트에 노출하지 않기 위해 Supabase Edge Function 프록시 경유.
// 인터페이스(함수명/파라미터/리턴값)는 기존과 동일하게 유지 — 호출부 수정 불필요.
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function generateComment(base64Image, mediaType = 'image/jpeg') {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요해요');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ base64Image, mediaType }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `콩이 한마디 생성 실패: ${res.status}`);
  }
  return data.comment;
}
