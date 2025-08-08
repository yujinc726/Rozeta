'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { recordings } from '@/lib/database'

interface WhisperTask {
  recordingId: string
  status: 'idle' | 'preparing' | 'uploading' | 'processing' | 'arranging' | 'saving' | 'completed' | 'error'
  progress: number
  statusMessage: string
  error?: string
  startedAt: Date
  completedAt?: Date
  isRegenerate?: boolean
}

interface WhisperContextType {
  tasks: Record<string, WhisperTask>
  startTranscription: (
    recordingId: string,
    audioUrl: string,
    options: {
      stableTs: boolean
      removeRepeated: boolean
      merge: boolean
      prompt: string
      regenerate?: boolean
    }
  ) => Promise<void>
  getTaskStatus: (recordingId: string) => WhisperTask | undefined
  clearTask: (recordingId: string) => void
}

const WhisperContext = createContext<WhisperContextType | undefined>(undefined)

export const WhisperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Record<string, WhisperTask>>({})

  const updateTask = useCallback((recordingId: string, updates: Partial<WhisperTask>) => {
    setTasks(prev => ({
      ...prev,
      [recordingId]: {
        ...prev[recordingId],
        ...updates
      }
    }))
  }, [])

  const startTranscription = useCallback(async (
    recordingId: string,
    audioUrl: string,
    options: {
      stableTs: boolean
      removeRepeated: boolean
      merge: boolean
      prompt: string
      regenerate?: boolean
    }
  ) => {
    // 이미 진행 중인 작업이 있는지 확인
    const currentTask = tasks[recordingId]
    if (currentTask?.status === 'processing') {
      toast.error('이미 변환 작업이 진행 중입니다.')
      return
    }
    
    console.log('🎤 Whisper 변환 시작:', {
      recordingId,
      regenerate: options.regenerate || false,
      prompt: options.prompt || '(없음)',
      timestamp: new Date().toISOString()
    })

    // 작업 초기화
    updateTask(recordingId, {
      recordingId,
      status: 'preparing',
      progress: 0,
      statusMessage: '오디오 파일을 준비하는 중...',
      startedAt: new Date(),
      isRegenerate: options.regenerate || false
    })

    try {
      // 1. 오디오 파일 로드
      updateTask(recordingId, { 
        status: 'preparing',
        statusMessage: '오디오 파일을 다운로드하는 중...',
        progress: 10
      })

      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) throw new Error('오디오 파일을 다운로드할 수 없습니다.')
      
      const audioBlob = await audioResponse.blob()
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

      // 2. 업로드 URL 생성
      updateTask(recordingId, { 
        status: 'uploading',
        statusMessage: '업로드 URL을 생성하는 중...',
        progress: 20
      })

      // 먼저 signed upload URL을 받아옴
      const uploadUrlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: audioFile.name,
          contentType: audioFile.type
        })
      })

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.text()
        throw new Error(`업로드 URL 생성 실패: ${error}`)
      }

      const { uploadUrl, publicUrl } = await uploadUrlResponse.json()

      // 3. 파일 업로드
      updateTask(recordingId, { 
        status: 'uploading',
        statusMessage: 'AI 서버에 오디오를 업로드하는 중...',
        progress: 25
      })

      // Signed URL로 직접 파일 업로드
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioFile,
        headers: {
          'Content-Type': audioFile.type
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.')
      }

      // 4. Whisper 처리
      updateTask(recordingId, { 
        status: 'processing',
        statusMessage: 'AI가 음성을 텍스트로 변환하는 중... (5-10분 소요)',
        progress: 30
      })

      // 긴 처리를 위해 타임아웃을 늘림
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000) // 10분 타임아웃

      // 진행률 시뮬레이션을 위한 인터벌  
      const progressInterval = setInterval(() => {
        setTasks(prev => {
          const task = prev[recordingId]
          if (task && task.status === 'processing' && task.progress < 70) {
            return {
              ...prev,
              [recordingId]: {
                ...task,
                progress: Math.min(task.progress + 5, 70)
              }
            }
          }
          return prev
        })
      }, 5000) // 5초마다 진행률 업데이트

      let result
      try {
        const transcribeResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_url: publicUrl,  // publicUrl 사용
            stable_ts: options.stableTs,
            remove_repeated: options.removeRepeated,
            merge: options.merge,
            prompt: options.prompt || '',
            regenerate: options.regenerate || false
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        clearInterval(progressInterval)

        if (!transcribeResponse.ok) {
          const error = await transcribeResponse.text()
          throw new Error(`변환 실패: ${error}`)
        }

        result = await transcribeResponse.json()
      } catch (error: any) {
        clearTimeout(timeoutId)
        clearInterval(progressInterval)
        throw error
      }
      
      updateTask(recordingId, { 
        status: 'arranging',
        statusMessage: '자막을 정리하는 중...',
        progress: 80
      })

      // 4. 데이터베이스에 저장
      updateTask(recordingId, { 
        status: 'saving',
        statusMessage: '데이터베이스에 저장하는 중...',
        progress: 90
      })

      // API 응답 구조 확인
      console.log('API 응답:', result)

      // 데이터 검증
      if (!result.rawSubtitles && !result.arrangedSubtitles) {
        console.warn('API 응답에서 자막 데이터를 찾을 수 없습니다:', result)
        throw new Error('변환된 자막 데이터가 없습니다.')
      }

      // 기존 코드와 동일한 필드명 사용
      try {
        const updateResult = await recordings.update(recordingId, {
          transcript: result.rawSubtitles || '',     // 단어 단위 자막
          subtitles: result.arrangedSubtitles || [] // 구문 단위 자막  
        })
        
        console.log('데이터베이스 업데이트 성공:', updateResult)
        
        if (!updateResult) {
          throw new Error('데이터베이스 업데이트 실패: 결과가 없습니다.')
        }
      } catch (dbError) {
        console.error('데이터베이스 업데이트 에러:', dbError)
        throw new Error(`데이터베이스 저장 실패: ${dbError instanceof Error ? dbError.message : '알 수 없는 에러'}`)
      }

      // 완료
      updateTask(recordingId, { 
        status: 'completed',
        statusMessage: '텍스트 변환이 완료되었습니다!',
        progress: 100,
        completedAt: new Date()
      })

      toast.success('AI 자막 · 텍스트 생성이 완료되었습니다!')

      // 짧은 지연 후 페이지 새로고침으로 업데이트 반영
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Transcription error:', error)
      
      updateTask(recordingId, { 
        status: 'error',
        statusMessage: '변환 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        progress: 0
      })

      toast.error(error instanceof Error ? error.message : '텍스트 변환 중 오류가 발생했습니다.')
    }
  }, [tasks, updateTask])

  const arrangeSubtitles = (segments: any[]): any[] => {
    if (!segments || segments.length === 0) return []

    const sentences: any[] = []
    let currentSentence: any = null

    segments.forEach((segment: any) => {
      if (!segment.words || segment.words.length === 0) return

      segment.words.forEach((word: any) => {
        const text = word.word.trim()
        
        if (!currentSentence) {
          currentSentence = {
            start: word.start,
            end: word.end,
            text: text
          }
        } else {
          currentSentence.end = word.end
          currentSentence.text += ' ' + text
        }

        // 문장 종료 조건
        if (text.match(/[.!?。！？]$/) || 
            currentSentence.text.length > 100 ||
            (word.end - currentSentence.start) > 10) {
          sentences.push({
            ...currentSentence,
            text: currentSentence.text.trim()
          })
          currentSentence = null
        }
      })
    })

    if (currentSentence) {
      sentences.push({
        ...currentSentence,
        text: currentSentence.text.trim()
      })
    }

    return sentences
  }

  const getTaskStatus = useCallback((recordingId: string) => {
    return tasks[recordingId]
  }, [tasks])

  const clearTask = useCallback((recordingId: string) => {
    setTasks(prev => {
      const newTasks = { ...prev }
      delete newTasks[recordingId]
      return newTasks
    })
  }, [])

  const value: WhisperContextType = {
    tasks,
    startTranscription,
    getTaskStatus,
    clearTask
  }

  return (
    <WhisperContext.Provider value={value}>
      {children}
    </WhisperContext.Provider>
  )
}

export const useWhisper = () => {
  const context = useContext(WhisperContext)
  if (context === undefined) {
    throw new Error('useWhisper must be used within a WhisperProvider')
  }
  return context
}
