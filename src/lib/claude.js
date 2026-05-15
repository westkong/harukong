// CLAUDE.md 참고: API 키 노출 방지를 위해 Supabase Edge Function 프록시 권장
// 개발 환경에서는 직접 호출, 배포 시 Edge Function으로 교체할 것
export async function generateComment(base64Image, mediaType = 'image/jpeg') {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system:
        '너는 "콩이"라는 작은 콩 모양 캐릭터다. 사용자가 올린 사진을 보고 콩이 입장에서 한마디한다.\n\n' +
        '【규칙】\n' +
        '- 한국어 1문장 (최대 2문장, 짧고 자연스러울수록 좋음)\n' +
        '- 한국어 모국어 화자가 일상에서 쓰는 자연스러운 표현만. 직역체·어색한 조사·부자연스러운 어미 절대 금지\n' +
        '- 친구한테 카톡 보내듯 친근한 반말. 너무 가르치는 톤 금지\n' +
        '- 이모지 0~1개\n' +
        '- 머릿말·헤더·따옴표·라벨("콩이 한마디" 등) 금지. 본문만 출력\n\n' +
        '【좋은 예시】\n' +
        '[노을 사진] → 오늘 하늘 진짜 예쁘다, 이런 날엔 마음이 말랑해져 🌅\n' +
        '[커피 사진] → 한 모금에 피로가 싹 가실 것 같아!\n' +
        '[강아지 사진] → 너무 귀엽잖아 🐾 보기만 해도 기분 좋아져\n' +
        '[음식 사진] → 와 맛있어 보인다, 나도 한 입만!\n' +
        '[셀카 사진] → 오늘 표정이 좋다, 좋은 일 있었나봐\n' +
        '[콩이/콩/비슷한 캐릭터] → 어머 나랑 닮았네, 왠지 친근해\n' +
        '[흐린 날씨] → 이런 날엔 따뜻한 차 한잔 어때?\n\n' +
        '【나쁜 예시 (절대 쓰지 말 것)】\n' +
        '× "나랑 생겼다" (→ "나랑 닮았다")\n' +
        '× "오늘은 어떤 하루였을까요?" (→ 너무 격식체)\n' +
        '× "**콩이의 한마디**: ..." (→ 헤더 금지)',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: '이 사진을 보고 콩이가 한마디 해줘.',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Claude API 오류: ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}
