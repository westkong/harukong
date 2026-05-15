# 하루콩 (HaruKong) 🫘

매일 사진 1장 + 한 줄 기록을 초대한 친구들끼리 공유하는 미니 소셜 일기 앱.
**앱인토스(토스 미니앱) 챌린지 제출용 — 마감 2026년 5월 24일**

---

## 기술 스택

- **Frontend**: React 18 + Vite
- **Backend/DB**: Supabase (PostgreSQL + Storage + Auth)
- **AI**: Claude API `claude-sonnet-4-20250514` — Vision으로 사진 분석 후 귀여운 코멘트 생성
- **배포**: 앱인토스 콘솔 (웹앱)

---

## 핵심 기능 (우선순위 순)

1. 소셜 로그인 (카카오 or 구글)
2. 매일 사진 1장 + 한 줄 텍스트 기록
3. Claude Vision → 귀여운 AI 코멘트 자동 생성 ("콩이 한마디")
4. 그룹 생성 + 초대 코드로 친구 초대
5. 그룹 피드 — 오늘 친구들 기록 모아보기
6. 이모지 반응 (🥹 👍 🔥 🫶)
7. 연속 기록 스트릭 카운터
8. 달력 모자이크 뷰 — 기록한 날 색으로 채워짐

---

## 디자인 가이드

- **기본 테마**: 민트 파스텔
- **6가지 테마 선택 가능**: 민트 / 라벤더 / 피치 / 스카이 / 버터 / 핑크
- **캐릭터명**: 콩이 🫘
- **톤**: 귀엽고 중성적인 파스텔, 남녀 모두 편한 느낌
- **폰트**: 시스템 기본 (Pretendard 사용 가능하면 적용)

### 테마 컬러 값

| 테마 | 메인 | 배경 | 텍스트 |
|------|------|------|--------|
| 민트 | `#3DAE89` | `#E8F8F3` | `#2E8C6E` |
| 라벤더 | `#7A6DB8` | `#F0EEF9` | `#5A4A9E` |
| 피치 | `#D4723E` | `#FEF2EC` | `#B85A2A` |
| 스카이 | `#4A8DC0` | `#EBF4FC` | `#2265A0` |
| 버터 | `#C8A030` | `#FDF8E8` | `#8A6A10` |
| 핑크 | `#E88FAA` | `#FFF0F5` | `#C45C85` |

---

## Supabase 테이블 구조

```sql
-- 유저
create table users (
  id uuid primary key references auth.users,
  nickname text not null,
  avatar_url text,
  theme text default 'mint',
  streak int default 0,
  last_posted_at date,
  created_at timestamptz default now()
);

-- 그룹
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  owner_id uuid references users(id),
  created_at timestamptz default now()
);

-- 그룹 멤버
create table group_members (
  group_id uuid references groups(id),
  user_id uuid references users(id),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- 게시물
create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  group_id uuid references groups(id),
  photo_url text,
  text text,
  ai_comment text,
  created_at timestamptz default now()
);

-- 이모지 반응
create table reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id),
  user_id uuid references users(id),
  emoji text not null,
  created_at timestamptz default now(),
  unique (post_id, user_id, emoji)
);
```

---

## 폴더 구조

```
src/
├── components/
│   ├── Home.jsx          # 오늘 기록 화면
│   ├── Feed.jsx          # 그룹 피드
│   ├── Calendar.jsx      # 달력 모자이크
│   ├── PostCard.jsx      # 피드 카드 (이모지 반응 포함)
│   ├── GroupInvite.jsx   # 그룹 생성/초대
│   └── ThemePicker.jsx   # 테마 선택
├── lib/
│   ├── supabase.js       # Supabase 클라이언트
│   └── claude.js         # Claude API 호출 (Vision 코멘트 생성)
├── hooks/
│   ├── useAuth.js
│   ├── usePosts.js
│   └── useStreak.js
├── App.jsx
└── main.jsx
```

---

## Claude API 코멘트 생성 예시

```js
// lib/claude.js
export async function generateComment(base64Image) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64Image }
          },
          {
            type: "text",
            text: "이 사진을 보고 콩이(🫘) 캐릭터가 한마디 해줘. 귀엽고 따뜻한 말투로, 1-2문장, 이모지 1개 포함. 한국어로."
          }
        ]
      }]
    })
  });
  const data = await res.json();
  return data.content[0].text;
}
```

---

## 개발 순서

- [ ] 1. Vite + React 프로젝트 세팅
- [ ] 2. Supabase 프로젝트 생성 + 테이블 마이그레이션
- [ ] 3. 소셜 로그인 (Auth)
- [ ] 4. 사진 업로드 + 한 줄 기록 + AI 코멘트
- [ ] 5. 그룹 생성 + 초대 코드
- [ ] 6. 그룹 피드 + 이모지 반응
- [ ] 7. 스트릭 + 달력 뷰
- [ ] 8. 테마 선택 기능
- [ ] 9. 앱인토스 빌드 제출

---

## 환경변수 (.env)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
```

> ⚠️ Claude API 키는 클라이언트에 노출되지 않도록 Supabase Edge Function으로 감싸는 걸 권장.
