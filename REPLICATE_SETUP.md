# Replicate API 설정 가이드

## 1. Replicate 계정 생성
1. [Replicate.com](https://replicate.com) 방문
2. GitHub 또는 Google 계정으로 가입
3. 이메일 인증 완료

## 2. API 토큰 생성
1. 로그인 후 프로필 아이콘 클릭
2. "API Tokens" 메뉴 선택
3. "Create Token" 버튼 클릭
4. 토큰 이름 입력 (예: "Rozeta Whisper")
5. 생성된 토큰 복사 (r8_로 시작하는 문자열)

## 3. 로컬 개발 환경 설정
`.env.local` 파일을 프로젝트 루트에 생성하고 다음 내용 추가:

```
REPLICATE_API_TOKEN=r8_your_actual_token_here
```

## 4. Vercel 배포 환경 설정
1. [Vercel 대시보드](https://vercel.com) 접속
2. 프로젝트 선택
3. Settings > Environment Variables
4. 다음 변수 추가:
   - Key: `REPLICATE_API_TOKEN`
   - Value: `r8_your_actual_token_here`
   - Environment: Production, Preview, Development 모두 체크
5. Save 버튼 클릭

## 5. 배포 후 확인
환경 변수 추가 후 재배포가 필요합니다:
1. Deployments 탭에서 최신 배포 확인
2. ... 메뉴 클릭 > Redeploy
3. "Use existing Build Cache" 체크 해제
4. Redeploy 버튼 클릭

## 문제 해결

### "Replicate API 토큰이 설정되지 않았습니다" 오류
- 환경 변수가 제대로 설정되었는지 확인
- Vercel에서 재배포 했는지 확인

### "Replicate API 토큰이 유효하지 않습니다" 오류
- 토큰이 올바른지 확인 (r8_로 시작해야 함)
- 토큰이 만료되지 않았는지 확인

### "Replicate 크레딧이 부족합니다" 오류
- Replicate 대시보드에서 크레딧 잔액 확인
- 필요시 크레딧 충전

## 비용 정보
- Incredibly Fast Whisper 모델: $0.00225 per second
- 10분 오디오 = 약 $1.35
- 신규 가입시 무료 크레딧 제공