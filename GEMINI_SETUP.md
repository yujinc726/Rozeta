# Gemini 2.5 Pro AI 설정 가이드

Rozeta에서 AI 기반 강의 설명 기능을 사용하려면 Google Gemini API 키가 필요합니다.

## 1. Gemini API 키 생성

1. [Google AI Studio](https://aistudio.google.com/)에 접속합니다.
2. Google 계정으로 로그인합니다.
3. 좌측 상단의 "Get API key" 버튼을 클릭합니다.
4. "Create API key"를 클릭하여 새 API 키를 생성합니다.
5. 생성된 API 키를 안전한 곳에 복사해 둡니다.

## 2. 환경 변수 설정

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```env
# Google Gemini API
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
```

⚠️ **주의사항:**
- `.env.local` 파일은 절대 Git에 커밋하지 마세요.
- API 키는 안전하게 보관하고 공유하지 마세요.

## 3. 기능 사용법

1. 녹음 상세 페이지에서 먼저 "AI 텍스트 변환"을 완료합니다.
2. 텍스트 변환이 완료되면 "AI 분석 시작하기" 버튼이 활성화됩니다.
3. 버튼을 클릭하면 Gemini 2.5 Pro가 전체 강의를 분석합니다.
4. 각 슬라이드별로 다음 정보가 생성됩니다:
   - 핵심 요약
   - 상세 설명
   - 연결 학습 (이전/다음 슬라이드와의 연관성)
   - 시험 출제 예상 포인트
   - 학습 팁

## 4. AI 설명 재생성

이미 생성된 AI 설명을 다시 생성하려면:
1. 각 슬라이드의 AI 설명 카드에서 "재생성" 버튼을 클릭합니다.
2. 전체 강의가 다시 분석되며, 모든 슬라이드의 설명이 업데이트됩니다.

## 5. 문제 해결

### API 키 오류
- `.env.local` 파일이 제대로 생성되었는지 확인하세요.
- API 키가 올바르게 복사되었는지 확인하세요.
- 서버를 재시작해보세요: `npm run dev`

### 분석 실패
- 텍스트 변환이 완료되었는지 확인하세요.
- 인터넷 연결 상태를 확인하세요.
- Google AI Studio에서 API 키의 할당량을 확인하세요.

## 6. 비용 정보

- Google AI Studio의 무료 할당량: 일반적으로 개인 사용에 충분합니다.
- 대규모 사용 시: [Google Cloud Vertex AI](https://cloud.google.com/vertex-ai) 사용을 고려하세요.

## 7. Gemini 2.5 Pro의 특징

- **대규모 컨텍스트**: 최대 1백만 토큰 처리 가능 (전체 강의를 한 번에 이해)
- **멀티모달**: 텍스트, 이미지, 오디오, 비디오 동시 처리
- **고급 추론**: "thinking model"로 더 정확한 분석 제공
- **한국어 지원**: 자연스러운 한국어 설명 생성

더 자세한 정보는 [Google AI 문서](https://ai.google.dev/gemini-api/docs)를 참조하세요.