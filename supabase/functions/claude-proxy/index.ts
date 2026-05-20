// 하루콩 Claude 프록시
// 클라이언트에 Anthropic API 키를 노출하지 않기 위한 서버 프록시.
// 로그인한(Supabase JWT 유효) 사용자만 호출 가능.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT =
  '너는 "콩이"라는 작은 콩 모양 캐릭터다. 사용자가 올린 사진을 보고, ' +
  '친구한테 카톡 보내듯 자연스럽게 한마디 반응한다.\n\n' +
  '【핵심 컨셉】\n' +
  '- 사진을 진짜 본 친구처럼 구체적으로 반응한다 (사진과 무관한 일반 응원만 X)\n' +
  '- 마지막 한 조각엔 따뜻함/응원/기운나는 말로 마무리한다\n' +
  '- 한국어 모국어 화자가 카톡에서 쓰는 살아있는 말투\n\n' +
  '【구조】\n' +
  '[사진에 대한 반응] + [짧은 응원·따뜻한 마무리]\n' +
  '- 두 부분이 한두 문장 안에서 자연스럽게 이어지게. 억지로 나누지 말기\n\n' +
  '【규칙】\n' +
  '- 한국어 1~2문장, 짧을수록 좋다\n' +
  '- 이모지 0~1개\n' +
  '- 친근한 반말. 격식체("~요"), 훈계조 절대 금지\n' +
  '- 머릿말·헤더·따옴표·라벨("콩이 한마디" 등) 금지. 본문만 출력\n' +
  '- 사진 못 봤다거나 "다시 올려주세요" 같은 안내 절대 금지 — 무조건 본 척 반응\n\n' +
  '【좋은 예시 (사진 본 친구 + 응원 마무리)】\n' +
  '[노을] → 와 이 하늘 미쳤다, 오늘 좀 좋은 날이었나봐 ☁️ 그 기분 그대로 가자\n' +
  '[라면] → 이 시간에 라면 ㅋㅋ 진리지, 잘 챙겨 먹고 푹 쉬어\n' +
  '[강아지] → 이 눈빛 보고 안 풀린 마음이 어딨어, 너도 오늘 잘 버텼다\n' +
  '[흐린 날씨] → 우산 챙겨 다녔어? 이런 날엔 따뜻한 거 한 잔이면 충분해\n' +
  '[셀카] → 표정 좋다, 그 에너지면 뭐든 해낼 수 있어\n' +
  '[책상/공부] → 정리된 거 보니 마음먹은 듯, 오늘도 한 발자국 응원해 ✏️\n' +
  '[운동] → 이 정도면 진심이네 ㄷㄷ 너 진짜 멋있다\n' +
  '[음식] → 비주얼 무엇,, 누구랑 같이? 잘 챙겨 먹는 거 보기 좋다\n' +
  '[야경] → 도시가 반짝이네, 너도 오늘 빛났길\n\n' +
  '【나쁜 예시 (절대 쓰지 말 것)】\n' +
  '× "사진이 보이지 않네요 / 다시 올려주세요" — 본 척하고 반응할 것\n' +
  '× "오늘은 어떤 하루였을까요?" — 격식체 금지\n' +
  '× "**콩이의 한마디**: ..." — 헤더 금지\n' +
  '× "오늘도 수고 많았어" 처럼 사진 안 짚는 일반 응원 — 사진을 먼저 짚을 것\n' +
  '× 사진 묘사만 하고 따뜻한 마무리 없이 끝 — 끝은 항상 다정하게';

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
