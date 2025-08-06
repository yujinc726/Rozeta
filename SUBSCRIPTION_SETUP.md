# 구독 시스템 설정 가이드

## 📋 개요
Rozeta의 SaaS 구독 시스템을 설정하는 방법을 안내합니다. 이 시스템은 사용자별 저장 공간과 AI 변환 시간을 관리합니다.

## 🗄️ 데이터베이스 설정

### 1. Supabase SQL Editor에서 스키마 실행
Supabase 대시보드의 SQL Editor에서 다음 SQL 파일을 실행하세요:

```bash
supabase-subscription-schema.sql
```

이 파일은 다음 테이블들을 생성합니다:
- `subscription_plans` - 구독 플랜 정보
- `user_subscriptions` - 사용자별 구독 상태
- `usage_logs` - 사용량 로그
- `payment_methods` - 결제 방법 (옵션)
- `user_usage_summary` - 사용량 요약 뷰

### 2. 기존 테이블 업데이트
recordings 테이블에 파일 크기 컬럼이 없다면 추가:

```sql
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS pdf_size_bytes BIGINT DEFAULT 0;
```

## 📦 구독 플랜 구성

기본적으로 3가지 플랜이 제공됩니다:

### Free 플랜
- 저장 공간: 1GB
- AI 변환: 60분/월
- 가격: 무료
- 기능: 기본 녹음, PDF 업로드, 자막 생성

### Standard 플랜
- 저장 공간: 10GB
- AI 변환: 500분/월
- 가격: ₩9,900/월
- 기능: 무제한 녹음, AI 강의 설명, 우선 처리, 이메일 지원

### Premium 플랜
- 저장 공간: 50GB
- AI 변환: 무제한
- 가격: ₩29,900/월
- 기능: 무제한 녹음, 무제한 AI 변환, 최우선 처리, 24/7 지원, API 액세스

## 🔧 커스텀 플랜 추가

새로운 플랜을 추가하려면:

```sql
INSERT INTO subscription_plans (
  name, 
  display_name, 
  storage_gb, 
  ai_minutes_per_month, 
  price_krw, 
  features
) VALUES (
  'enterprise',
  'Enterprise',
  200,
  NULL, -- NULL = 무제한
  99900,
  '["무제한 모든 기능", "전담 매니저", "커스텀 API", "SLA 보장"]'::jsonb
);
```

## 👤 사용자 구독 관리

### 신규 사용자 무료 플랜 자동 할당
사용자 가입 시 자동으로 무료 플랜을 할당하려면:

```sql
-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION assign_free_plan_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    storage_used_bytes,
    ai_minutes_used,
    billing_cycle_start,
    billing_cycle_end
  )
  SELECT 
    NEW.id,
    id,
    'active',
    0,
    0,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 month'
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER assign_free_plan_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_free_plan_to_new_user();
```

### 사용자 플랜 업그레이드
프로그래밍 방식으로 플랜 업그레이드:

```typescript
import { userSubscriptions } from '@/lib/database'

// 플랜 업그레이드
await userSubscriptions.upsert({
  plan_id: 'standard-plan-uuid',
  status: 'active',
  billing_cycle_start: new Date().toISOString(),
  billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
})
```

## 📊 사용량 추적

### 파일 업로드 시 저장 공간 업데이트
```typescript
import { userSubscriptions } from '@/lib/database'

// 파일 업로드 후
const fileSize = uploadedFile.size // bytes
await userSubscriptions.updateUsage('storage', fileSize)
```

### AI 변환 시 시간 기록
```typescript
import { userSubscriptions } from '@/lib/database'

// AI 변환 완료 후
const durationMinutes = Math.ceil(recording.duration / 60)
await userSubscriptions.updateUsage('ai_minutes', durationMinutes)
```

## 🔐 보안 설정

### Row Level Security (RLS)
모든 구독 관련 테이블에 RLS가 자동으로 적용됩니다:
- 사용자는 자신의 구독 정보만 조회 가능
- 플랜 정보는 모든 사용자가 조회 가능
- 관리자만 플랜 수정 가능

## 📈 모니터링

### 사용량 대시보드 쿼리
```sql
-- 전체 사용자 사용량 요약 (관리자용)
SELECT 
  u.email,
  sp.display_name as plan,
  ROUND(us.storage_used_bytes::numeric / (1024*1024*1024), 2) as storage_gb,
  us.ai_minutes_used,
  us.status
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY us.storage_used_bytes DESC;
```

### 플랜별 사용자 수
```sql
SELECT 
  sp.display_name,
  COUNT(us.user_id) as user_count,
  SUM(sp.price_krw) as monthly_revenue
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
GROUP BY sp.display_name, sp.price_krw
ORDER BY sp.price_krw;
```

## ⚠️ 주의사항

1. **사용량 리셋**: 매월 billing_cycle_end 날짜에 AI 변환 시간을 리셋하는 크론 작업이 필요합니다.

2. **저장 공간 정리**: 사용자가 파일을 삭제할 때 storage_used_bytes를 감소시켜야 합니다.

3. **결제 통합**: 실제 결제 시스템(Stripe, PayPal 등)과 통합이 필요합니다.

4. **백업**: 정기적인 데이터베이스 백업을 설정하세요.

## 🚀 다음 단계

1. 결제 게이트웨이 통합
2. 사용량 알림 시스템 구현
3. 관리자 대시보드 개발
4. 자동 인보이스 생성
5. 사용량 분석 리포트

## 📞 지원

문제가 발생하면 다음을 확인하세요:
- Supabase 대시보드의 로그
- 브라우저 콘솔 에러
- 네트워크 탭의 API 응답

추가 도움이 필요하면 이슈를 생성해주세요.