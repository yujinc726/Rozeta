import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

// Supabase 환경 변수들
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 개발 환경에서 환경 변수 확인
if (typeof window !== 'undefined') {
  console.log('🔍 Supabase 환경 변수 확인:')
  console.log('URL:', supabaseUrl ? '✅ 설정됨' : '❌ 없음')
  console.log('Key:', supabaseKey ? '✅ 설정됨' : '❌ 없음')
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다.')
    console.warn('다음 환경 변수를 .env.local 파일에 설정해주세요:')
    console.warn('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  } else {
    console.log('✅ Supabase 환경 변수가 올바르게 설정되었습니다.')
  }
}

// Supabase 클라이언트 생성
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Auth 헬퍼 함수들
export const auth = {
  // 현재 사용자 가져오기
  async getUser() {
    return await supabase.auth.getUser()
  },

  // 로그인
  async signIn(email: string, password: string) {
    console.log('🔐 로그인 시도:', { email, url: supabaseUrl })
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      console.error('❌ Supabase URL이 설정되지 않았습니다!')
      return { data: null, error: { message: 'Supabase URL이 설정되지 않았습니다.' } }
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('🚫 로그인 에러:', error)
      } else {
        console.log('✅ 로그인 성공:', data.user?.email)
      }
      
      return { data, error }
    } catch (err) {
      console.error('💥 로그인 예외 발생:', err)
      return { data: null, error: { message: '네트워크 연결을 확인해주세요.' } }
    }
  },

  // 회원가입
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  },

  // 로그아웃
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // 세션 체크
  async getSession() {
    return await supabase.auth.getSession()
  },

  // 인증 상태 변경 리스너
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // 사용자 정보 업데이트
  async updateUser(attributes: { data?: any }) {
    const { data, error } = await supabase.auth.updateUser(attributes)
    return { data, error }
  },
}

// Supabase 연결 테스트 함수
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('subjects').select('count')
    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
    console.log('Supabase connection test successful')
    return true
  } catch (error) {
    console.error('Supabase connection test error:', error)
    return false
  }
}

// 데이터베이스 타입 정의
export interface Subject {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface Recording {
  id: string
  subject_id: string
  title: string
  audio_url?: string
  pdf_url?: string
  transcript?: string
  subtitles?: string
  summary?: string
  key_terms?: any
  exam_questions?: any
  duration?: number
  created_at: string
  updated_at: string
  user_id: string
  ai_lecture_overview?: any
  ai_analyzed_at?: string
  file_size_bytes?: number
  pdf_size_bytes?: number
}

export interface RecordEntry {
  id: string
  recording_id: string
  material_name: string
  slide_number: number
  start_time: string
  end_time: string
  memo?: string
  created_at: string
  ai_explanation?: any
  ai_generated_at?: string
  ai_model?: string
}

// 구독 플랜 인터페이스
export interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  storage_gb: number
  ai_minutes_per_month: number | null // null means unlimited
  price_krw: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// 사용자 구독 인터페이스
export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  started_at: string
  expires_at: string | null
  storage_used_bytes: number
  ai_minutes_used: number
  billing_cycle_start: string
  billing_cycle_end: string
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan // 조인된 플랜 정보
}

// 사용량 로그 인터페이스
export interface UsageLog {
  id: string
  user_id: string
  type: 'storage' | 'ai_minutes' | 'api_calls'
  amount: number
  metadata?: any
  recorded_at: string
}

// 결제 방법 인터페이스
export interface PaymentMethod {
  id: string
  user_id: string
  type: 'card' | 'bank_transfer' | 'paypal'
  last_four?: string
  expires_at?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// 사용량 요약 인터페이스
export interface UsageSummary {
  user_id: string
  email: string
  plan_id: string
  plan_name: string
  plan_display_name: string
  plan_storage_gb: number
  plan_ai_minutes: number | null
  storage_used_bytes: number
  ai_minutes_used: number
  billing_cycle_start: string
  billing_cycle_end: string
  subscription_status: string
  storage_used_gb: number
  storage_used_percent: number
  ai_minutes_used_percent: number
} 