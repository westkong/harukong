# 하루콩 진행 상태 (Claude.ai 챗 동기화용)

> 이 문서는 Claude Code(클로드 코드)가 매 단계 완료 시 갱신합니다.
> 챗(Claude.ai)과 상의할 때 이 파일 전체를 복사해서 붙여넣으면 같은 컨텍스트에서 답변받을 수 있습니다.

**오늘 날짜**: 2026-05-14 (마감 2026-05-24, **D-10**)
**최종 갱신**: 2026-05-14 — 1단계 완료, 2단계 결정 대기

---

## 📌 한 줄 요약

Vite + React + Supabase 클라이언트 골격 완성. 라우터·인증 상태 관리·6테마 CSS 변수·플레이스홀더 컴포넌트까지 완료. 빌드 통과 확인. **다음 단계는 사용자 결정 대기 중.**

---

## ✅ 지금까지 한 일

### 코드 (CLAUDE.md 개발 순서 기준)
- [x] **1. Vite + React 프로젝트 세팅**
  - Vite 8 + React 19 + react-router-dom + @supabase/supabase-js 설치
  - 폴더 구조: `src/{components, lib, hooks}` 생성
  - `src/lib/supabase.js` — Supabase 클라이언트
  - `src/lib/claude.js` — Claude Vision API 헬퍼 (`anthropic-dangerous-direct-browser-access` 헤더 포함, 배포 시 Edge Function으로 교체 권장)
  - `src/index.css` — Pretendard 폰트 + **6가지 테마 CSS 변수** (mint/lavender/peach/sky/butter/pink) + 모바일 앱 셸 (max-width 430px)
  - `src/App.jsx` — BrowserRouter + Supabase 세션 구독 + 테마 자동 로딩
  - 플레이스홀더 컴포넌트 5개: `Login.jsx` (구글 OAuth), `Home.jsx`, `Feed.jsx`, `Calendar.jsx`, `GroupInvite.jsx`, `BottomNav.jsx`
  - `.env` 템플릿 + `.env.example` + `.gitignore`에 `.env` 추가
  - `npx vite build` 성공 확인 (432KB, gzip 125KB)

### 토스 출시 준비 (TOSS_MINIAPP_LAUNCH_GUIDE 기준)
- [x] 사업자 정보 → **먹픽 때 등록한 거 재활용 (확정)**
- [ ] 나머지 모두 미진행 (아래 일정 참고)

---

## 🗓️ D-10 일정 역산

| 단계 | 소요 | 시작 권장 | 마지막 시작 가능 |
|---|---|---|---|
| 토스 콘솔 앱 등록 → 검토 | 영업일 2일 | 즉시 | 5/19 |
| 약관 작성 + Vercel 호스팅 | 1일 | 코드와 병행 | 5/20 |
| 코드 개발 (CLAUDE.md 2~8단계) | 5~7일 | 즉시 | — |
| Apps in Toss Framework 적용 + .ait 빌드 | 0.5일 | 코드 마감 후 | 5/22 |
| 검토 요청 → 통과 | 영업일 2~3일 | — | **5/20** (마감 5/24 맞추려면) |

> **가장 빡빡한 핀치**: 5/20에는 검토 요청이 들어가야 안전. 즉 **코드 개발 마감은 5/19**.

---

## 🤔 사용자가 한 결정

| 항목 | 결정 |
|---|---|
| 사업자 정보 | 먹픽 등록 재활용 |
| 약관/개인정보처리방침 | **처음부터 새로 작성** (먹픽 약관 복사 X) |
| 작업 방식 | **천천히 하나씩**, 매 단계 챗과 상의 후 진행 |

---

## ❓ 챗과 상의해볼 만한 오픈 질문

1. **소셜 로그인 — 카카오 vs 구글 vs 토스 로그인 중 어느 것?**
   - CLAUDE.md엔 카카오 or 구글, 토스 미니앱 가이드엔 "토스 로그인" 권장 (콘솔에서 약관 등록도 토스 로그인 기준)
   - 챌린지 UX 측면에서는 토스 로그인이 마찰 가장 적음 → **토스 로그인 추천**
   - 다만 Supabase Auth 통합이 필요 → 구글 OAuth보다 설정 복잡할 수 있음

2. **앱 영문 이름(appName)** — 콘솔 등록값 = `granite.config.ts`의 `appName`. 후보:
   - `harukong` (가장 직관적)
   - `harubean` (영어 친화적)
   - `dailybean`

3. **Claude API 직접 호출 vs Supabase Edge Function 프록시**
   - 현재 클라이언트에서 직접 호출 — `.env`의 키가 빌드에 포함되어 노출됨
   - 토스 미니앱은 사용자가 번들 뜯어볼 일 거의 없지만, 공개 배포 원칙상 Edge Function 프록시 권장
   - Edge Function 만들면 +0.5~1일

4. **앱 카테고리 / 검색 키워드 5개** — 콘솔 등록 시 필요. 챗과 같이 정하면 좋음.

5. **챌린지 제출 형태** — "출시 완료한 앱"이어야 하는지, "검토 통과한 앱"이어도 되는지? (가이드엔 명시 없음)

---

## 🎯 다음 단계 (제안 — 1개만)

**제안: 「토스 콘솔에 하루콩 앱 정보 먼저 등록」**

**이유:**
- 영업일 2일 검토 — 가장 긴 외부 의존성. 지금 시작 안 하면 5/19 시작해야 5/21 통과, 검토 요청까지 빠듯해짐.
- 콘솔 등록은 코드 완성과 무관 (이름·카테고리·로고만 있으면 됨)
- 검토 받는 동안 코드 개발 병행 가능

**필요 산출물 (콘솔 입력용):**
- 한글 앱 이름: 하루콩
- 영어 앱 이름 (Display name): HaruKong
- **appName** (영문 소문자, 위 오픈 질문 #2): 결정 필요
- 카테고리: 결정 필요 (생활? 소셜?)
- 검색 키워드 5개: 결정 필요
- 고객 문의 이메일: lee1211ht@gmail.com 으로?
- 디자인 자산 (썸네일 1920×828, 로고 600×600, 스크린샷 636×1048 ×3장): 별도 작업 필요

→ **챗과 상의해서 위 항목들 정하고 오면, 그동안 클로드 코드는 대기. 결정되면 다음에 뭘 할지 결정.**

---

## 📁 프로젝트 구조 현재

```
C:\HaruKong\
├── src/
│   ├── components/  (Login, Home, Feed, Calendar, GroupInvite, BottomNav)
│   ├── lib/         (supabase.js, claude.js)
│   ├── hooks/       (비어있음 — 2단계에서 useAuth, usePosts, useStreak 추가 예정)
│   ├── App.jsx      (라우터 + 세션 + 테마)
│   ├── App.css      (비어있음)
│   ├── index.css    (6테마 + 글로벌)
│   └── main.jsx
├── .env             (값 비어있음 — Supabase/Anthropic 키 채워야 함)
├── .env.example
├── .gitignore       (.env 추가 완료)
├── CLAUDE.md
├── PROGRESS.md      ← 이 파일
├── package.json
└── vite.config.js
```
