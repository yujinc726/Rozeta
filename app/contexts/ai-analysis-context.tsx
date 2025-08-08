'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'

interface AIAnalysisTask {
  recordingId: string
  status: 'idle' | 'preparing' | 'analyzing' | 'saving' | 'completed' | 'error'
  progress: number
  statusMessage: string
  error?: string
  startedAt?: Date
  completedAt?: Date
}

interface AIAnalysisContextType {
  tasks: Record<string, AIAnalysisTask>
  startAnalysis: (recordingId: string, options: { prompt?: string, regenerate?: boolean }) => Promise<void>
  getTaskStatus: (recordingId: string) => AIAnalysisTask | undefined
  clearTask: (recordingId: string) => void
}

const AIAnalysisContext = createContext<AIAnalysisContextType | undefined>(undefined)

export const AIAnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Record<string, AIAnalysisTask>>({})

  const updateTask = useCallback((recordingId: string, updates: Partial<AIAnalysisTask>) => {
    setTasks(prev => ({
      ...prev,
      [recordingId]: {
        ...prev[recordingId],
        ...updates
      }
    }))
  }, [])

  const startAnalysis = useCallback(async (
    recordingId: string,
    options: { prompt?: string, regenerate?: boolean }
  ) => {
    // 이미 진행 중인 작업이 있는지 확인
    const currentTask = tasks[recordingId]
    if (currentTask?.status === 'analyzing') {
      toast.error('이미 AI 분석이 진행 중입니다.')
      return
    }

    // 작업 초기화
    updateTask(recordingId, {
      recordingId,
      status: 'preparing',
      progress: 0,
      statusMessage: '녹음 데이터를 준비하는 중...',
      startedAt: new Date()
    })

    try {
      // 1. 녹음 정보는 API에서 처리하므로 건너뜀
      updateTask(recordingId, { 
        status: 'preparing',
        statusMessage: '분석을 준비하는 중...',
        progress: 10
      })

      // 2. AI 분석 시작
      updateTask(recordingId, { 
        status: 'analyzing',
        statusMessage: 'AI가 강의 내용을 분석하는 중... (2-5분 소요)',
        progress: 20
      })

      // 진행률 시뮬레이션을 위한 인터벌
      const progressInterval = setInterval(() => {
        setTasks(prev => {
          const task = prev[recordingId]
          if (task && task.status === 'analyzing' && task.progress < 70) {
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
      }, 3000) // 3초마다 진행률 업데이트

      let result
      try {
        const analysisResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recording_id: recordingId,
            custom_prompt: options.prompt || '',
            regenerate: options.regenerate || false
          })
        })

        clearInterval(progressInterval)

        if (!analysisResponse.ok) {
          const error = await analysisResponse.text()
          throw new Error(`AI 분석 실패: ${error}`)
        }

        result = await analysisResponse.json()
      } catch (error: any) {
        clearInterval(progressInterval)
        throw error
      }
      
      // 3. 결과 저장
      updateTask(recordingId, { 
        status: 'saving',
        statusMessage: '분석 결과를 저장하는 중...',
        progress: 90
      })

      // API 응답 구조 확인
      console.log('AI 분석 응답:', result)

      // 데이터베이스에 저장
      try {
        // API 응답이 이미 데이터베이스를 업데이트했으므로 
        // 여기서는 추가 업데이트가 필요하지 않음
        console.log('AI 분석 완료:', result)
      } catch (dbError) {
        console.error('데이터베이스 업데이트 에러:', dbError)
        throw new Error(`데이터베이스 저장 실패: ${dbError instanceof Error ? dbError.message : '알 수 없는 에러'}`)
      }

      // 완료
      updateTask(recordingId, { 
        status: 'completed',
        statusMessage: 'AI 분석이 완료되었습니다!',
        progress: 100,
        completedAt: new Date()
      })

      toast.success('AI 강의 설명 생성이 완료되었습니다!')

      // 짧은 지연 후 페이지 새로고침으로 업데이트 반영
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('AI analysis error:', error)
      
      updateTask(recordingId, { 
        status: 'error',
        statusMessage: 'AI 분석 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        progress: 0
      })

      toast.error(error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다.')
    }
  }, [tasks, updateTask])

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

  const value: AIAnalysisContextType = {
    tasks,
    startAnalysis,
    getTaskStatus,
    clearTask
  }

  return (
    <AIAnalysisContext.Provider value={value}>
      {children}
    </AIAnalysisContext.Provider>
  )
}

export const useAIAnalysis = () => {
  const context = useContext(AIAnalysisContext)
  if (!context) {
    throw new Error('useAIAnalysis must be used within an AIAnalysisProvider')
  }
  return context
}
