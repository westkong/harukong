import { getAnonymousKey } from '@apps-in-toss/web-framework';
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 토스 앱 밖(로컬 개발/브라우저 미리보기)에서는 getAnonymousKey가
// undefined/ERROR를 반환한다. 그때는 브라우저에 고정 키를 만들어 개발이 가능하게 한다.
async function resolveUserKey() {
  try {
    const result = await getAnonymousKey();
    if (result && result.type === 'HASH' && result.hash) {
      return result.hash;
    }
  } catch {
    // 토스 환경 아님 → 폴백
  }
  const KEY = 'harukong_dev_anon_key';
  let dev = localStorage.getItem(KEY);
  if (!dev) {
    dev = 'dev_' + crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(KEY, dev);
  }
  return dev;
}

// 토스 익명키 → Edge Function → Supabase 세션 설정
export async function signInWithToss() {
  const hash = await resolveUserKey();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/toss-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ hash }),
  });

  const data = await res.json();
  if (!res.ok || !data.session) {
    throw new Error(data.error || '로그인에 실패했어요');
  }

  const { error } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (error) throw error;

  return data.session;
}
