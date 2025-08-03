# Rozeta

AI 기반 강의 녹음 및 자동 노트 생성 서비스

## 주요 기능

- 📱 **슬라이드 동기화 녹음**: PDF 업로드 후 슬라이드 전환 시점을 간단히 기록
- 🤖 **AI 자동 변환**: Whisper AI로 음성→텍스트, GPT로 요약·키워드·문제 생성
- 📊 **3단 스마트 노트**: 슬라이드 썸네일, 전체 스크립트, AI 분석 결과를 한눈에
- 🗂️ **과목별 관리**: 체계적인 폴더 구조로 강의별 정리

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 데이터베이스
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI API (AI 처리용)
OPENAI_API_KEY=sk-...
```

### 3. 데이터베이스 설정
1. Supabase 프로젝트 생성
2. `supabase-schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행
3. Storage에서 `recordings`, `documents` 버킷 생성

### 4. 개발 서버 실행
```bash
npm run dev
```

## 기술 스택

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI (Whisper + GPT-4)
- **PDF Processing**: PDF.js

## 사용 방법

1. **회원가입/로그인** - Supabase 통합 인증
2. **과목 생성** - 사이드바에서 새 과목 추가
3. **녹음 시작** - PDF 업로드 후 "새 기록 시작" 클릭
4. **슬라이드 동기화** - 강의 중 슬라이드 넘김 시 "다음 슬라이드" 버튼 클릭
5. **AI 분석** - 녹음 완료 후 자동으로 AI 처리 시작
6. **노트 확인** - 3단 구조의 스마트 노트에서 학습

## 라이선스

MIT License 