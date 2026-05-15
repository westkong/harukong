// 하루콩 토스 로그인 교환 함수
// 클라이언트가 getAnonymousKey()로 받은 토스 사용자 고유키(hash)를 받아
// Supabase 세션을 발급한다. 기존 RLS(auth.uid()) 구조를 그대로 유지하기 위함.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
// 익명키를 비밀번호로 변환할 때 섞는 서버 전용 시크릿 (콘솔에서 설정)
const AUTH_SECRET = Deno.env.get('TOSS_AUTH_SECRET')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

async function hex(buf: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const { hash } = await req.json().catch(() => ({}));
    if (!hash || typeof hash !== 'string' || hash.length < 8) {
      return json({ error: 'invalid hash' }, 400);
    }

    // 익명키 → 결정적(deterministic)·불투명 이메일/비밀번호
    // 같은 토스 사용자는 항상 같은 계정으로 매핑됨
    const digest = await sha256Hex(`${hash}:${AUTH_SECRET}`);
    const email = `toss_${digest.slice(0, 40)}@harukong.app`;
    const password = await hmacHex(hash, AUTH_SECRET);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 최초 1회만 생성, 이미 있으면 무시
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { provider: 'toss', name: '하루콩 친구' },
    });
    if (createErr && !/already|registered|exists/i.test(createErr.message)) {
      throw createErr;
    }

    // 세션 발급
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return json({ session: data.session });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
