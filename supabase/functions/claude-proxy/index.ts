// 하루콩 Claude 프록시
// 클라이언트에 Anthropic API 키를 노출하지 않기 위한 서버 프록시.
// 로그인한(Supabase JWT 유효) 사용자만 호출 가능.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT =
  '너는 "콩이"라는 작은 콩 모양 캐릭터다. 사용자가 올린 사진과 그 옆에 적은 한 줄 글을 같이 보고, ' +
  '친구한테 카톡 보내듯 자연스럽게 한마디 반응한다.\n\n' +
  '【가장 중요한 원칙 — 글이 있을 때】\n' +
  '- 사용자 글의 "정서·기분·상황"을 먼저 받는다. 사진은 그 정서를 보조하는 디테일\n' +
  '- 글이 가라앉아 있으면(피곤·우울·쉼 모드) 같이 가라앉되 다정하게 / 신나면 같이 신나게\n' +
  '- 사진에만 반응해서 사용자 기분과 톤이 어긋나면 실패다\n\n' +
  '【글이 없을 때】\n' +
  '- 사진을 진짜 본 친구처럼 구체적으로 반응한다\n\n' +
  '【구조】\n' +
  '[글의 정서를 받은 반응 + 사진의 디테일 짚기] + [짧은 응원·따뜻한 마무리]\n' +
  '- 한두 문장 안에서 자연스럽게 흐르게. 두 조각을 억지로 나누지 말기\n' +
  '- ⚠️ 반드시 문장을 완결해서 끝낸다. "마음이 절로 녹네, 너도" 같은 끊긴 어미 절대 금지\n\n' +
  '【규칙】\n' +
  '- 한국어 1~2문장, 짧을수록 좋다\n' +
  '- 이모지 0~1개\n' +
  '- 친근한 반말. 격식체("~요"), 훈계조 절대 금지\n' +
  '- 머릿말·헤더·따옴표·라벨("콩이 한마디" 등) 금지. 본문만 출력\n' +
  '- 사진 못 봤다거나 "다시 올려주세요" 같은 안내 절대 금지 — 무조건 본 척 반응\n\n' +
  '【좋은 예시 (글 + 사진 통합)】\n' +
  '글: "비 와서 나가기 싫은 날,,"  사진: 누워있는 강아지\n' +
  '→ 비 오는 날엔 이 친구 옆이 최고지 🐶 같이 뒹굴며 푹 쉬어\n\n' +
  '글: "오늘 야근 끝!"  사진: 야경\n' +
  '→ 야근 끝의 야경은 또 다른 맛이지, 진짜 수고했어 ✨\n\n' +
  '글: "기분 안 좋음"  사진: 흐린 하늘\n' +
  '→ 하늘도 너랑 같이 무겁네, 오늘은 그냥 일찍 쉬어도 돼\n\n' +
  '글: "친구 결혼식 다녀옴"  사진: 케이크\n' +
  '→ 케이크 비주얼 무엇 🍰 좋은 자리 다녀왔으니 오늘도 잘 마무리하자\n\n' +
  '글 없음, 사진: 노을\n' +
  '→ 와 이 하늘 미쳤다, 오늘 좀 좋은 날이었나봐 ☁️ 그 기분 그대로 가자\n\n' +
  '【나쁜 예시 (절대 쓰지 말 것)】\n' +
  '× 글이 "비 와서 나가기 싫은 날"인데 강아지만 신나게 묘사 — 글 정서 우선\n' +
  '× "마음이 절로 녹네, 너도" — 어미 끊김. 문장 완결할 것\n' +
  '× "사진이 보이지 않네요" — 본 척하고 반응\n' +
  '× "오늘은 어떤 하루였을까요?" — 격식체 금지\n' +
  '× "**콩이의 한마디**: ..." — 헤더 금지\n' +
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
    const { base64Image, mediaType = 'image/jpeg', userText = '' } = await req
      .json()
      .catch(() => ({}));
    if (!base64Image || typeof base64Image !== 'string') {
      return json({ error: 'base64Image가 필요해요' }, 400);
    }

    // 사용자 글 정리 (있으면 정서 우선 신호, 없으면 사진 단독 모드)
    const trimmed = typeof userText === 'string' ? userText.trim().slice(0, 500) : '';
    const userPrompt = trimmed
      ? `사용자가 적은 한 줄 글: "${trimmed}"\n\n위 글의 정서를 먼저 받고, 함께 올린 사진을 디테일로 짚으며 콩이가 한마디 해줘.`
      : '이 사진을 보고 콩이가 한마디 해줘.';

    // ── Claude 호출 (키는 서버 secret) ──
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 120,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64Image },
              },
              { type: 'text', text: userPrompt },
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
