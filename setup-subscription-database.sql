-- ===================================================================
-- Rozeta 구독 시스템 데이터베이스 설정
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ===================================================================

-- 1. 구독 플랜 테이블 생성
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  storage_gb INTEGER NOT NULL,
  ai_minutes_per_month INTEGER, -- NULL means unlimited
  price_krw INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 사용자 구독 상태 테이블 생성
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  storage_used_bytes BIGINT DEFAULT 0,
  ai_minutes_used INTEGER DEFAULT 0,
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. 사용량 로그 테이블 생성
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('storage', 'ai_minutes', 'api_calls')),
  amount BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. 결제 정보 테이블 생성 (선택사항)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_transfer', 'paypal')),
  last_four TEXT,
  expires_at DATE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON usage_logs(type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_recorded_at ON usage_logs(recorded_at);

-- 6. recordings 테이블에 파일 크기 컬럼 추가
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS pdf_size_bytes BIGINT DEFAULT 0;

-- 7. 기본 구독 플랜 데이터 삽입
INSERT INTO subscription_plans (name, display_name, storage_gb, ai_minutes_per_month, price_krw, features) VALUES
('free', 'Free', 1, 60, 0, '["기본 녹음", "PDF 업로드", "자막 생성"]'::jsonb),
('standard', 'Standard', 10, 500, 9900, '["무제한 녹음", "AI 강의 설명", "우선 처리", "이메일 지원"]'::jsonb),
('premium', 'Premium', 50, NULL, 29900, '["무제한 녹음", "무제한 AI 변환", "최우선 처리", "24/7 지원", "API 액세스"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 8. RLS (Row Level Security) 정책 설정
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독 정보만 볼 수 있음
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
CREATE POLICY "Users can insert own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용량 로그 정책
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage logs" ON usage_logs;
CREATE POLICY "Users can insert own usage logs" ON usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 결제 방법 정책
DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own payment methods" ON payment_methods;
CREATE POLICY "Users can manage own payment methods" ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- 모든 사용자가 플랜 정보를 볼 수 있음
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
CREATE POLICY "Anyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 9. 사용량 계산 함수들
CREATE OR REPLACE FUNCTION calculate_storage_usage(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  total_bytes BIGINT;
BEGIN
  SELECT COALESCE(SUM(COALESCE(file_size_bytes, 0) + COALESCE(pdf_size_bytes, 0)), 0)
  INTO total_bytes
  FROM recordings
  WHERE user_id = p_user_id;
  
  RETURN total_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_ai_usage_this_month(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_minutes INTEGER;
BEGIN
  SELECT COALESCE(SUM(CEIL(COALESCE(duration, 0)::numeric / 60)), 0)
  INTO total_minutes
  FROM recordings
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    AND subtitles IS NOT NULL; -- AI 변환이 완료된 것만
  
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at 
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 사용자별 전체 사용량 뷰
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT 
  u.id as user_id,
  u.email,
  us.plan_id,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  sp.storage_gb as plan_storage_gb,
  sp.ai_minutes_per_month as plan_ai_minutes,
  us.storage_used_bytes,
  us.ai_minutes_used,
  us.billing_cycle_start,
  us.billing_cycle_end,
  us.status as subscription_status,
  ROUND(us.storage_used_bytes::numeric / (1024*1024*1024), 2) as storage_used_gb,
  ROUND((us.storage_used_bytes::numeric / (sp.storage_gb * 1024*1024*1024)) * 100, 1) as storage_used_percent,
  CASE 
    WHEN sp.ai_minutes_per_month IS NULL THEN 0
    ELSE ROUND((us.ai_minutes_used::numeric / sp.ai_minutes_per_month) * 100, 1)
  END as ai_minutes_used_percent
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id;

-- 12. 신규 사용자 자동 무료 플랜 할당 (선택사항)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (신규 사용자 가입 시 자동 무료 플랜 할당)
DROP TRIGGER IF EXISTS assign_free_plan_on_signup ON auth.users;
CREATE TRIGGER assign_free_plan_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_free_plan_to_new_user();

-- ===================================================================
-- 설정 완료!
-- 
-- 다음 단계:
-- 1. 이 SQL을 Supabase Dashboard > SQL Editor에서 실행
-- 2. 웹 애플리케이션을 새로고침하여 테스트
-- 3. 구독 기능이 정상적으로 작동하는지 확인
-- ===================================================================