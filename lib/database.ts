import { supabase } from './supabase'
import type { Subject, Recording, RecordEntry } from './supabase'

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

  // 새 과목 생성
  async create(name: string, description?: string): Promise<Subject> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')
    
    console.log('Creating subject in database:', { name, userId: user.id, description })
    
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        description,
        user_id: user.id
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