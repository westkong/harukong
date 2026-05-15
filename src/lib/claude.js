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
        '× 사진 묘사만 하고 응원 없이 끝내기 (→ 반드시 기운 나는 마무리)',
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
