# Rozeta 설정 가이드

## 필수 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정해주세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API (AI 처리용)
OPENAI_API_KEY=sk-...
```

## 1. Supabase 설정

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. Settings > API 섹션으로 이동
4. Project URL과 anon public key 복사
5. `.env.local` 파일에 붙여넣기

## 3. 데이터베이스 스키마 설정

Supabase SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하여 필요한 테이블을 생성하세요.

## 4. Supabase Storage 설정

1. Supabase Dashboard에서 Storage 섹션으로 이동
2. 다음 버킷 생성:
   - `recordings` (오디오 파일용)
   - `documents` (PDF 파일용)
3. 각 버킷의 정책을 설정하여 인증된 사용자만 업로드/다운로드 가능하도록 설정

## 5. 실행

```bash
npm install
npm run dev
```

## 문제 해결

### "Supabase 설정이 필요합니다" 에러
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 정확한지 확인 (NEXT_PUBLIC_ 접두사 필수)
- 개발 서버를 재시작 (`npm run dev`)

### "인증 오류가 발생했습니다" 에러
- Supabase 대시보드에서 Auth 설정 확인
- 로컬 개발의 경우 `localhost:3000`이 허용되어 있는지 확인