# URL 업로드 방식 설정 가이드

## 개요
대용량 오디오 파일 처리 시 안정성을 위해 Data URI 방식에서 URL 방식으로 전환했습니다.

## 필요한 환경 변수
`.env.local` 파일에 다음 환경 변수들이 설정되어 있어야 합니다:

```bash
# Supabase (기존)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 새로 필요!

# Replicate (기존)
REPLICATE_API_TOKEN=your_replicate_token
```

## Supabase Service Role Key 가져오기
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. Settings → API
4. "Service role" 섹션에서 키 복사
5. `.env.local`에 추가

## 작동 방식
1. **파일 업로드 준비**: 클라이언트가 `/api/upload-url`로 presigned URL 요청
2. **직접 업로드**: 브라우저에서 Supabase Storage로 직접 업로드 (서버 부담 없음)
3. **URL 전송**: 업로드된 파일의 public URL을 Replicate API에 전달
4. **임시 파일 정리**: 처리 완료 후 자동으로 임시 파일 삭제

## 장점
- ✅ 대용량 파일 처리 가능 (50MB 이상도 OK)
- ✅ 서버리스 타임아웃 문제 해결
- ✅ Replicate API payload 크기 제한 회피
- ✅ 더 빠른 처리 속도
- ✅ 안정적인 에러 처리

## 문제 해결
### "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다" 에러
- `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가
- 서버 재시작 (`npm run dev`)

### "Upload URL 생성 실패" 에러
- Supabase Storage에 'recordings' 버킷이 있는지 확인
- Service Role Key가 올바른지 확인

### "파일 업로드 실패" 에러
- 네트워크 연결 확인
- 파일 크기가 너무 크지 않은지 확인 (권장: 200MB 이하)