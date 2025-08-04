# Supabase Storage 설정 문제 해결 가이드

## 현재 문제
"업로드 URL 생성 실패" 에러가 발생하고 있습니다. 이는 대부분 환경 변수 설정이나 Supabase Storage 설정 문제입니다.

## 1. 환경 변수 확인

`.env.local` 파일에 다음 3개의 환경 변수가 모두 설정되어 있어야 합니다:

```bash
# Supabase 기본 설정
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...[your-anon-key]

# ⚠️ 새로 필요한 환경 변수 (이게 없으면 에러 발생!)
SUPABASE_SERVICE_ROLE_KEY=eyJ...[your-service-role-key]

# Replicate (기존)
REPLICATE_API_TOKEN=r8_...[your-replicate-token]
```

## 2. Service Role Key 가져오는 방법

1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **Settings** 클릭
4. **API** 탭 선택
5. **Service role** 섹션에서 키 복사 (⚠️ 이 키는 절대 클라이언트에 노출하면 안됨!)
6. `.env.local`에 추가
7. **서버 재시작** (`Ctrl+C` 후 `npm run dev`)

## 3. Storage 버킷 생성 확인

### Supabase Dashboard에서 확인:
1. 좌측 메뉴에서 **Storage** 클릭
2. `recordings` 버킷이 있는지 확인
3. 없다면 **New bucket** 클릭하여 생성:
   - Name: `recordings`
   - Public bucket: ✅ 체크 (반드시!)
   - File size limit: 200 (MB)
   - Allowed MIME types: `audio/*`

### SQL로 버킷 생성 (옵션):
```sql
-- Supabase SQL Editor에서 실행
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recordings', 'recordings', true, 209715200, '{audio/*}')
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 209715200,
    allowed_mime_types = '{audio/*}';
```

## 4. Storage 정책 설정

`supabase-storage-policies.sql` 파일의 내용을 Supabase SQL Editor에서 실행했는지 확인하세요.

## 5. 디버깅 방법

### Storage 설정 테스트 방법

#### 방법 1: UI에서 테스트 (권장)
1. WhisperProcessor 화면 열기
2. "Storage 테스트" 버튼 클릭
3. 결과 확인

#### 방법 2: API 직접 호출
브라우저에서 다음 URL을 열어보세요:
```
http://localhost:3000/api/test-storage
```

성공 시 응답 예시:
```json
{
  "success": true,
  "details": {
    "hasUrl": true,
    "hasServiceKey": true,
    "recordingsBucketExists": true,
    "canCreateSignedUrl": true
  }
}
```

실패 시 응답을 보고 문제를 파악할 수 있습니다:
- `hasServiceKey: false` → Service Role Key 설정 필요
- `recordingsBucketExists: false` → recordings 버킷 생성 필요
- `canCreateSignedUrl: false` → 권한 문제 또는 정책 설정 필요

## 6. 자주 발생하는 문제

### "Storage 접근 권한이 없습니다"
- Service Role Key가 올바른지 확인
- 복사할 때 앞뒤 공백이 포함되지 않았는지 확인

### "Storage 버킷이 설정되지 않았습니다"
- Supabase Dashboard에서 'recordings' 버킷 생성
- 버킷이 public으로 설정되어 있는지 확인

### "Upload URL 생성에 실패했습니다"
- Storage 정책이 올바르게 설정되어 있는지 확인
- `supabase-storage-policies.sql` 실행 여부 확인

## 7. 완전한 재설정 (최후의 수단)

모든 것이 실패하면:
1. Supabase Dashboard에서 Storage → recordings 버킷 삭제
2. 위의 SQL로 다시 생성
3. storage 정책 SQL 다시 실행
4. 서버 재시작