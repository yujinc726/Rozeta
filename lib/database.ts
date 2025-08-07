import { supabase } from './supabase'
import type { 
  Subject, 
  Recording, 
  RecordEntry,
  SubscriptionPlan,
  UserSubscription,
  UsageLog,
  PaymentMethod,
  UsageSummary
} from './supabase'

// 과목 관련 함수들
export const subjects = {
  // 사용자의 모든 과목 조회
  async getAll(): Promise<Subject[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 사용자의 모든 과목 조회 (user_id를 매개변수로 받는 버전)
  async list(userId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 새 과목 생성
  async create(params: { name: string; user_id: string; description?: string }): Promise<Subject> {
    const { name, user_id, description } = params
    
    console.log('Creating subject in database:', { name, userId: user_id, description })
    
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        description,
        user_id
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Supabase 연결 실패: URL을 확인해주세요.')
      } else if (error.code === '42P01') {
        throw new Error('subjects 테이블이 존재하지 않습니다. 데이터베이스 스키마를 확인해주세요.')
      } else if (error.code === '42501') {
        throw new Error('권한 오류: RLS 정책을 확인해주세요.')
      }
      
      throw error
    }
    
    console.log('Subject created:', data)
    return data
  },

  // 과목 수정
  async update(id: string, updates: Partial<Pick<Subject, 'name' | 'description'>>): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 과목 삭제
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// 녹음 관련 함수들
export const recordings = {
  // 특정 과목의 모든 녹음 조회
  async getBySubject(subjectId: string): Promise<Recording[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')
    
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get recordings by subject:', error)
      throw error
    }
    return data || []
  },

  // 사용자의 모든 녹음 조회
  async getAll(): Promise<Recording[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')
    
    const { data, error } = await supabase
      .from('recordings')
      .select('*, subjects(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 특정 과목의 모든 녹음 조회 (subject_id를 매개변수로 받는 버전)
  async list(subjectId: string): Promise<Recording[]> {
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get recordings by subject:', error)
      throw error
    }
    return data || []
  },

  // 사용자의 모든 녹음 조회 (user_id를 매개변수로 받는 버전)
  async listAll(userId: string): Promise<Recording[]> {
    const { data, error } = await supabase
      .from('recordings')
      .select('*, subjects(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 특정 녹음 조회
  async get(recordingId: string): Promise<Recording | null> {
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  // 새 녹음 세션 생성
  async create(
    subjectId: string, 
    title: string, 
    duration?: number
  ): Promise<Recording> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')
    
    const { data, error } = await supabase
      .from('recordings')
      .insert({
        subject_id: subjectId,
        title,
        user_id: user.id,
        duration
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 녹음 정보 업데이트
  async update(id: string, updates: Partial<Recording>): Promise<Recording> {
    const { data, error } = await supabase
      .from('recordings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 녹음 삭제
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// 기록 엔트리 관련 함수들
export const recordEntries = {
  // 특정 녹음의 모든 기록 엔트리 조회
  async getByRecording(recordingId: string): Promise<RecordEntry[]> {
    const { data, error } = await supabase
      .from('record_entries')
      .select('*')
      .eq('recording_id', recordingId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // 특정 녹음의 모든 기록 엔트리 조회
  async getByRecordingId(recordingId: string): Promise<RecordEntry[]> {
    const { data, error } = await supabase
      .from('record_entries')
      .select('*')
      .eq('recording_id', recordingId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // 새 기록 엔트리 생성
  async create(
    recordingId: string,
    materialName: string,
    slideNumber: number,
    startTime: string,
    endTime: string,
    memo?: string
  ): Promise<RecordEntry> {
    const { data, error } = await supabase
      .from('record_entries')
      .insert({
        recording_id: recordingId,
        material_name: materialName,
        slide_number: slideNumber,
        start_time: startTime,
        end_time: endTime,
        memo
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 기록 엔트리 수정
  async update(id: string, updates: Partial<RecordEntry>): Promise<RecordEntry> {
    const { data, error } = await supabase
      .from('record_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 기록 엔트리 삭제
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('record_entries')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// 파일 업로드 관련 함수들
export const storage = {
  // 오디오 파일 업로드
  async uploadAudio(file: File, recordingId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${recordingId}/audio.${fileExt}`
    
    console.log('Uploading audio file:', { fileName, fileSize: file.size, fileType: file.type })
    
    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // 같은 이름 파일이 있으면 덮어쓰기
      })
    
    if (error) {
      console.error('Audio upload error:', error)
      throw new Error(`오디오 업로드 실패: ${error.message}`)
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName)
    
    console.log('Audio uploaded successfully:', publicUrl)
    return publicUrl
  },

  // PDF 파일 업로드
  async uploadPDF(file: File, recordingId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${recordingId}/slides.${fileExt}`
    
    console.log('Uploading PDF file:', { fileName, fileSize: file.size, fileType: file.type })
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // 같은 이름 파일이 있으면 덮어쓰기
      })
    
    if (error) {
      console.error('PDF upload error:', error)
      throw new Error(`PDF 업로드 실패: ${error.message}`)
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)
    
    console.log('PDF uploaded successfully:', publicUrl)
    return publicUrl
  },

  // 파일 삭제
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  }
}

// 설정 관련 함수들
export const settingsDb = {
  // 사용자 설정 가져오기
  async get(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // PGRST116: no rows returned (정상적인 경우)
        if (error.code === 'PGRST116') {
          return null
        }
        
        // 42P01: table does not exist
        if (error.code === '42P01') {
          console.warn("user_settings 테이블이 존재하지 않습니다. SQL 스크립트를 실행해주세요.")
          return null
        }
        
        console.error("Error fetching settings:", error)
        throw error
      }

      return data?.settings || null
    } catch (error) {
      console.error("Error in settings.get:", error)
      return null
    }
  },

  // 사용자 설정 업데이트
  async update(settings: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error("Error updating settings:", error)
        throw error
      }
    } catch (error) {
      console.error("Error in settings.update:", error)
      throw error
    }
  }
}

// 프로필 관련 함수들
export const profiles = {
  // 현재 사용자의 프로필 정보 조회
  async getCurrent(): Promise<{ full_name: string | null, email: string } | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.warn('프로필 정보를 가져올 수 없습니다:', error)
        // profiles 테이블이 없거나 데이터가 없는 경우 기본값 반환
        return {
          full_name: null,
          email: user.email || ''
        }
      }
      
      return {
        full_name: data?.full_name || null,
        email: user.email || ''
      }
    } catch (error) {
      console.warn('프로필 조회 중 오류:', error)
      return {
        full_name: null,
        email: user.email || ''
      }
    }
  },

  // 사용자 이름 표시 (full_name이 있으면 사용, 없으면 이메일 앞부분)
  async getDisplayName(): Promise<string> {
    const profile = await this.getCurrent()
    if (!profile) return '사용자'
    
    if (profile.full_name && profile.full_name.trim()) {
      return profile.full_name.trim()
    }
    
    return profile.email?.split('@')[0] || '사용자'
  }
}

// 구독 플랜 관련 함수들
export const subscriptionPlans = {
  // 모든 활성 플랜 조회
  async getAll(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_krw', { ascending: true })

    if (error) throw error
    return data || []
  },

  // 특정 플랜 조회
  async getById(planId: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (error) throw error
    return data
  }
}

// 사용자 구독 관련 함수들
export const userSubscriptions = {
  // 현재 사용자의 구독 조회
  async getCurrent(): Promise<UserSubscription | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    return data
  },

  // 사용자의 구독 생성 또는 업데이트
  async upsert(subscription: Partial<UserSubscription>): Promise<UserSubscription> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        ...subscription,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 사용량 업데이트
  async updateUsage(type: 'storage' | 'ai_minutes', amount: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    // 현재 구독 조회
    const subscription = await this.getCurrent()
    if (!subscription) {
      throw new Error('활성 구독이 없습니다.')
    }

    // 사용량 업데이트
    const updateField = type === 'storage' ? 'storage_used_bytes' : 'ai_minutes_used'
    const currentValue = subscription[updateField] || 0
    
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        [updateField]: currentValue + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (error) throw error

    // 사용량 로그 기록
    await usageLogs.create(type, amount)
  }
}

// 사용량 로그 관련 함수들
export const usageLogs = {
  // 사용량 로그 생성
  async create(type: 'storage' | 'ai_minutes' | 'api_calls', amount: number, metadata?: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        type,
        amount,
        metadata,
        recorded_at: new Date().toISOString()
      })

    if (error) throw error
  },

  // 기간별 사용량 조회
  async getByPeriod(type: 'storage' | 'ai_minutes' | 'api_calls', startDate: Date, endDate: Date): Promise<UsageLog[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .gte('recorded_at', startDate.toISOString())
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 이번 달 사용량 조회
  async getCurrentMonthUsage(): Promise<{
    storage: number
    ai_minutes: number
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const endOfMonth = new Date()
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)
    endOfMonth.setDate(0)
    endOfMonth.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('usage_logs')
      .select('type, amount')
      .eq('user_id', user.id)
      .gte('recorded_at', startOfMonth.toISOString())
      .lte('recorded_at', endOfMonth.toISOString())

    if (error) throw error

    const usage = {
      storage: 0,
      ai_minutes: 0
    }

    data?.forEach(log => {
      if (log.type === 'storage') {
        usage.storage += log.amount
      } else if (log.type === 'ai_minutes') {
        usage.ai_minutes += log.amount
      }
    })

    return usage
  }
}

// 사용량 요약 관련 함수들
export const usageSummary = {
  // 현재 사용자의 사용량 요약 조회
  async getCurrent(): Promise<UsageSummary | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
      .from('user_usage_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    return data
  },

  // 저장 공간 사용량 계산 (바이트 단위)
  async calculateStorageUsage(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    // recordings 테이블에서 사용자의 모든 파일 크기 합계
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('file_size_bytes, pdf_size_bytes')
      .eq('user_id', user.id)

    if (recordingsError) throw recordingsError

    let totalBytes = 0
    recordings?.forEach(rec => {
      totalBytes += (rec.file_size_bytes || 0) + (rec.pdf_size_bytes || 0)
    })

    return totalBytes
  },

  // 저장 공간 사용량을 타입별로 구분해서 계산
  async calculateStorageUsageDetailed(): Promise<{
    audioBytes: number
    pdfBytes: number
    totalBytes: number
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('file_size_bytes, pdf_size_bytes')
      .eq('user_id', user.id)

    if (recordingsError) throw recordingsError

    let audioBytes = 0
    let pdfBytes = 0
    recordings?.forEach(rec => {
      audioBytes += (rec.file_size_bytes || 0)
      pdfBytes += (rec.pdf_size_bytes || 0)
    })

    return {
      audioBytes,
      pdfBytes,
      totalBytes: audioBytes + pdfBytes
    }
  },

  // AI 변환 시간 사용량 계산 (분 단위)
  async calculateAIMinutesUsage(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    // 이번 달 AI 변환 시간 계산
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('recordings')
      .select('duration')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
      .not('subtitles', 'is', null) // AI 변환이 완료된 것만

    if (error) throw error

    let totalMinutes = 0
    data?.forEach(rec => {
      if (rec.duration) {
        totalMinutes += Math.ceil(rec.duration / 60) // 초를 분으로 변환
      }
    })

    return totalMinutes
  }
}

// 결제 방법 관련 함수들
export const paymentMethods = {
  // 사용자의 모든 결제 방법 조회
  async getAll(): Promise<PaymentMethod[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 기본 결제 방법 설정
  async setDefault(paymentMethodId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    // 먼저 모든 결제 방법의 is_default를 false로 설정
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id)

    // 선택한 결제 방법을 기본으로 설정
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)

    if (error) throw error
  }
} 