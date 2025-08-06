# 🗄️ Supabase 데이터베이스 설정 가이드

## 📋 개요
Rozeta 구독 시스템을 위한 데이터베이스 테이블과 함수들을 설정합니다.

## 🚀 빠른 설정

### 1단계: SQL 스크립트 실행
1. Supabase Dashboard에 로그인
2. 프로젝트 선택
3. **SQL Editor** 메뉴로 이동
4. `setup-subscription-database.sql` 파일의 내용을 복사
5. SQL Editor에 붙여넣기
6. **RUN** 버튼 클릭

### 2단계: 실행 확인
SQL 실행 후 다음 메시지가 표시되어야 합니다:
```
Success. No rows returned
```

### 3단계: 테이블 확인
**Table Editor**에서 다음 테이블들이 생성되었는지 확인:
- ✅ `subscription_plans`
- ✅ `user_subscriptions` 
- ✅ `usage_logs`
- ✅ `payment_methods`

## 📊 생성되는 테이블 구조

### subscription_plans (구독 플랜)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 플랜 ID |
| name | TEXT | 플랜 이름 (free, standard, premium) |
| display_name | TEXT | 표시용 이름 |
| storage_gb | INTEGER | 저장 공간 (GB) |
| ai_minutes_per_month | INTEGER | 월 AI 변환 시간 (NULL=무제한) |
| price_krw | INTEGER | 월 요금 (원) |
| features | JSONB | 기능 목록 |

### user_subscriptions (사용자 구독)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 구독 ID |
| user_id | UUID | 사용자 ID |
| plan_id | UUID | 플랜 ID |
| status | TEXT | 상태 (active, cancelled, expired, trial) |
| storage_used_bytes | BIGINT | 사용 중인 저장 공간 (바이트) |
| ai_minutes_used | INTEGER | 이번 달 AI 변환 사용 시간 |
| billing_cycle_start | DATE | 결제 주기 시작일 |
| billing_cycle_end | DATE | 결제 주기 종료일 |

### usage_logs (사용량 로그)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 로그 ID |
| user_id | UUID | 사용자 ID |
| type | TEXT | 사용량 타입 (storage, ai_minutes, api_calls) |
| amount | BIGINT | 사용량 |
| recorded_at | TIMESTAMP | 기록 시간 |

## 🔒 보안 설정

### Row Level Security (RLS)
모든 테이블에 RLS가 적용되어 있습니다:
- 사용자는 자신의 데이터만 조회/수정 가능
- 구독 플랜은 모든 사용자가 조회 가능
- 관리자만 플랜 수정 가능

### 자동 권한 할당
- 신규 가입 사용자에게 자동으로 무료 플랜 할당
- 사용자별 격리된 데이터 접근

## 📈 기본 데이터

### 생성되는 기본 플랜
1. **Free 플랜**
   - 저장 공간: 1GB
   - AI 변환: 60분/월
   - 가격: 무료

2. **Standard 플랜**
   - 저장 공간: 10GB
   - AI 변환: 500분/월
   - 가격: ₩9,900/월

3. **Premium 플랜**
   - 저장 공간: 50GB
   - AI 변환: 무제한
   - 가격: ₩29,900/월

## 🛠️ 유틸리티 함수

### calculate_storage_usage(user_id)
사용자의 총 저장 공간 사용량 계산 (바이트 단위)

### calculate_ai_usage_this_month(user_id)
이번 달 AI 변환 사용 시간 계산 (분 단위)

## 🔍 테스트 쿼리

### 플랜 목록 조회
```sql
SELECT * FROM subscription_plans WHERE is_active = true;
```

### 사용자 구독 상태 확인
```sql
SELECT 
  u.email,
  sp.display_name as plan,
  us.status,
  us.storage_used_bytes,
  us.ai_minutes_used
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id;
```

### 사용량 요약 뷰 조회
```sql
SELECT * FROM user_usage_summary;
```

## ⚠️ 주의사항

1. **백업**: SQL 실행 전 데이터베이스 백업 권장
2. **환경**: 프로덕션 환경에서는 신중하게 실행
3. **권한**: 적절한 권한으로 실행했는지 확인

## 🐛 문제 해결

### 에러: "relation already exists"
- 이미 테이블이 존재하는 경우 발생
- `IF NOT EXISTS` 구문으로 안전하게 처리됨

### 에러: "permission denied"
- RLS 정책 문제
- Supabase Dashboard에서 정책 확인

### 에러: "function does not exist"
- 함수 생성 실패
- SQL을 다시 실행하여 함수 재생성

## 📞 지원

문제가 발생하면:
1. Supabase Dashboard > Logs 확인
2. SQL Editor의 에러 메시지 확인
3. 브라우저 콘솔 로그 확인

## ✅ 설정 완료 후

데이터베이스 설정이 완료되면:
1. 웹 애플리케이션 새로고침
2. 대시보드 페이지에서 구독 정보 확인
3. 사용량 트래커 정상 작동 확인

모든 설정이 완료되면 구독 기반 SaaS 기능을 사용할 수 있습니다! 🎉