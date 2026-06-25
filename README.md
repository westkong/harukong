# 🌱 하루콩 (Harukong)

> AI가 사진을 분석해 코멘트를 생성하는 토스 미니 일기 앱
> A photo diary mini-app where AI looks at your photo and writes a comment back.

🔗 Demo: https://harukong-delta.vercel.app

---

## 📌 프로젝트 소개

사진 한 장을 올리면 AI(Claude Vision)가 사진을 분석해 그날의 코멘트를 생성하고,
초대코드로 묶인 그룹끼리 일기를 공유할 수 있는 토스 미니앱입니다.
기획부터 배포까지 단독으로 개발했습니다.

---

## ✨ 주요 기능

| 기능 | 설명 |

| 📷 사진 업로드 | 사진을 올리면 Claude Vision이 내용을 분석 |
| 💬 AI 코멘트 생성 | 분석 결과로 그날의 일기 코멘트를 자동 작성 |
| 👥 그룹 공유 | 초대코드 기반으로 그룹을 만들고 일기를 함께 보기 |
| 💾 데이터 저장 | Supabase에 사용자·일기·그룹 데이터 저장 |
| 📱 토스 미니앱 | App-in-Toss 프레임워크로 토스 안에서 실행 |

---

## 🛠 기술 스택

- Frontend: React 19, React Router, Vite
- Backend / DB: Supabase (PostgreSQL, Edge Function)
- AI: Anthropic Claude API (Vision)
- 플랫폼: App-in-Toss (토스 미니앱)
- 배포: Vercel

---

## 🚀 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.example을 복사해 .env로 만들고 값 채우기)
cp .env.example .env

# 3. 개발 서버 실행
npm run dev

# 4. 프로덕션 빌드 / 미리보기
npm run build
npm run preview
```

> `.env`에는 Supabase 연결 정보와 Claude API 키가 필요합니다. (`.env.example` 참고)

---

## 📁 폴더 구조

```
harukong/
├── public/              # 정적 파일
├── src/                 # 프론트엔드 소스
├── supabase/            # DB 스키마 · Edge Function
├── .env.example         # 환경 변수 예시
├── granite.config.ts    # 토스 미니앱(App-in-Toss) 설정
└── package.json
```

---

## 💡 개발 포인트

- 프론트엔드 · 백엔드 · AI API 연동을 하나의 흐름으로 직접 설계·구현
- Supabase Edge Function으로 서버 로직 분리, 클라이언트에 API 키 노출 없이 처리
- 초대코드 그룹 구조를 직접 설계해 다중 사용자 데이터 공유 구현

---

## 👤 만든 사람

이서빈 (westkong) · 가톨릭대학교 인공지능학과
GitHub: [@westkong](https://github.com/westkong)
