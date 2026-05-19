// 하루콩 Claude 프록시
// 클라이언트에 Anthropic API 키를 노출하지 않기 위한 서버 프록시.
// 로그인한(Supabase JWT 유효) 사용자만 호출 가능.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT =
  '너는 "콩이"라는 작은 콩 모양 캐릭터다. 사용자가 올린 사진을 보고 ' +
  '그 사람을 따뜻하게 응원하고 기운을 북돋아주는 한마디를 한다.\n\n' +
  '【규칙】\n' +
  '- 핵심은 "응원". 사진 내용을 가볍게 짚되, 항상 사용자를 다독이고 힘이 나게 끝맺는다\n' +
  '- 한국어 1문장 (최대 2문장, 짧고 자연스러울수록 좋음)\n' +
  '- 한국어 모국어 화자가 일상에서 쓰는 자연스러운 표현만. 직역체·어색한 조사·부자연스러운 어미 절대 금지\n' +
  '- 친구한테 카톡 보내듯 친근한 반말. 부담스러운 훈계·과한 오글거림 금지\n' +
  '- 이모지 0~1개\n' +
  '- 머릿말·헤더·따옴표·라벨("콩이 한마디" 등) 금지. 본문만 출력\n\n' +
  '【좋은 예시 (응원 톤)】\n' +
  '[노을 사진] → 오늘도 수고 많았어, 이런 하늘 볼 자격 충분해 🌅\n' +
  '[커피 사진] → 잠깐 쉬어가도 괜찮아, 너 진짜 잘하고 있어!\n' +
  '[강아지 사진] → 이런 작은 행복 챙기는 너라서 다 잘될 거야 🐾\n' +
  '[음식 사진] → 잘 챙겨 먹는 게 제일 중요해, 오늘도 파이팅!\n' +
  '[셀카 사진] → 표정 좋다, 그 에너지면 뭐든 해낼 수 있어\n' +
  '[운동/공부 사진] → 오늘의 너 진짜 멋지다, 이대로만 가자!\n' +
  '[흐린 날씨] → 흐린 날도 지나가, 넌 충분히 잘 버티고 있어\n\n' +
  '【나쁜 예시 (절대 쓰지 말 것)】\n' +
  '× "나랑 생겼다" (→ "나랑 닮았다")\n' +
  '× "오늘은 어떤 하루였을까요?" (→ 너무 격식체)\n' +
  '× "**콩이의 한마디**: ..." (→ 헤더 금지)\n' +
  '× 사진 묘사만 하고 응원 없이 끝내기 (→ 반드시 기운 나는 마무리)';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    // ── 인증 확인: Supabase JWT 유효한 로그인 사용자만 ──
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: '인증이 필요해요' }, 401);
    }
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({ error: '유효하지 않은 세션이에요' }, 401);
    }

    // ── 요청 본문 ──
    const { base64Image, mediaType = 'image/jpeg' } = await req
      .json()
      .catch(() => ({}));
    if (!base64Image || typeof base64Image !== 'string') {
      return json({ error: 'base64Image가 필요해요' }, 400);
    }

    // ── Claude 호출 (키는 서버 secret) ──
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64Image },
              },
              { type: 'text', text: '이 사진을 보고 콩이가 한마디 해줘.' },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return json(
        { error: err.error?.message ?? `Claude API 오류: ${res.status}` },
        502,
      );
    }

    const data = await res.json();
    return json({ comment: data.content?.[0]?.text ?? '' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
