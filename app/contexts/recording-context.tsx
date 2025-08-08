'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { recordings as recordingsDb, recordEntries, storage } from '@/lib/database'
import { auth } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface SlideSync {
  id: string
  pdfFileName: string
  slideNumber: number
  startTime: string
  endTime?: string
  recordingTime: number
  memo?: string
}

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  recordingTitle: string
  subjectId: string
  subjectName: string
  slideSyncs: SlideSync[]
  currentSlideNumber: number
  selectedPdfIndex: number
  pdfFiles: File[]
  totalSlides: number
  slideMemo: string
  allSlideThumbnails: string[][]
  pdfLastPages: number[]
}

interface RecordingContextType extends RecordingState {
  // Actions
  startRecording: (subjectId: string, subjectName: string, title: string) => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<void>
  cancelRecording: () => void
  markCurrentSlide: () => void
  updateRecordingTitle: (title: string) => void
  updateSlideMemo: (memo: string) => void
  setPdfFiles: (files: File[]) => void
  setSelectedPdfIndex: (index: number) => void
  setCurrentSlideNumber: (number: number) => void
  setTotalSlides: (total: number) => void
  setAllSlideThumbnails: (thumbnails: string[][]) => void
  setPdfLastPages: (pages: number[]) => void
  updateSlideSyncs: (syncs: SlideSync[]) => void
  navigateToRecordPage: () => void
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined)

export const RecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  
  // Recording state
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    recordingTitle: '',
    subjectId: '',
    subjectName: '',
    slideSyncs: [],
    currentSlideNumber: 1,
    selectedPdfIndex: -1,
    pdfFiles: [],
    totalSlides: 0,
    slideMemo: '',
    allSlideThumbnails: [],
    pdfLastPages: []
  })

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get user on mount
  useEffect(() => {
    auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  // Timer logic
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = now - startTimeRef.current + pausedTimeRef.current
        setState(prev => ({ ...prev, recordingTime: elapsed }))
      }, 10)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state.isRecording, state.isPaused])

  const startRecording = useCallback(async (subjectId: string, subjectName: string, title: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.start(1000)
      
      // Update state
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        recordingTime: 0,
        recordingTitle: title,
        subjectId,
        subjectName,
        slideSyncs: []
      }))
      
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      pausedAtRef.current = 0
      
      // Add first slide sync
      const firstSlide: SlideSync = {
        id: Date.now().toString(),
        pdfFileName: state.selectedPdfIndex >= 0 && state.pdfFiles[state.selectedPdfIndex] 
          ? state.pdfFiles[state.selectedPdfIndex].name 
          : '',
        slideNumber: state.selectedPdfIndex >= 0 ? state.currentSlideNumber : 0,
        startTime: '00:00:00.000',
        recordingTime: 0,
        memo: ''
      }
      setState(prev => ({ ...prev, slideSyncs: [firstSlide] }))
      
      toast.success('녹음이 시작되었습니다!')
    } catch (error: any) {
      console.error('녹음 시작 실패:', error)
      if (error.name === 'NotAllowedError') {
        toast.error('마이크 권한이 거부되었습니다.')
      } else if (error.name === 'NotFoundError') {
        toast.error('마이크를 찾을 수 없습니다.')
      } else {
        toast.error(`마이크 접근 오류: ${error.message}`)
      }
    }
  }, [state.selectedPdfIndex, state.pdfFiles, state.currentSlideNumber])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setState(prev => ({ ...prev, isPaused: true }))
      pausedAtRef.current = Date.now()
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isPaused && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setState(prev => ({ ...prev, isPaused: false }))
      const pauseDuration = Date.now() - pausedAtRef.current
      pausedTimeRef.current += pauseDuration
      startTimeRef.current = Date.now() - state.recordingTime + pausedTimeRef.current
    }
  }, [state.isPaused, state.recordingTime])

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const ms = milliseconds % 1000
    
    return {
      display: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`,
      formatted: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
  }

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    const currentTime = formatTime(state.recordingTime).display
    const updatedSlideSyncs = state.slideSyncs.map((sync, index) => {
      if (index === state.slideSyncs.length - 1 && !sync.endTime) {
        return { ...sync, endTime: currentTime }
      }
      return sync
    })

    // Stop recording
    if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())

    // Save recording
    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve()
        return
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        try {
          if (!user?.id) throw new Error('사용자 정보를 찾을 수 없습니다.')
          if (!state.subjectId) throw new Error('과목 정보가 없습니다.')
          if (!state.recordingTitle.trim()) throw new Error('녹음 제목이 없습니다.')
          if (state.recordingTime <= 0) throw new Error('녹음 시간이 유효하지 않습니다.')
          if (!audioBlob || audioBlob.size === 0) throw new Error('녹음된 오디오 데이터가 없습니다.')

          // 1. Save recording to database
          const recording = await recordingsDb.create(
            state.subjectId,
            state.recordingTitle,
            Math.floor(state.recordingTime / 1000)
          )

          // 2. Upload audio file
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
          let audioUrl = ''
          
          try {
            audioUrl = await storage.uploadAudio(audioFile, recording.id)
          } catch (uploadError) {
            console.error('Audio upload failed:', uploadError)
            toast.warning('녹음은 저장되었지만 오디오 파일 업로드에 실패했습니다.')
          }

          // 3. Upload PDF files
          const pdfUrls: string[] = []
          let totalPdfSize = 0
          for (const pdf of state.pdfFiles) {
            try {
              const pdfUrl = await storage.uploadPDF(pdf, recording.id)
              pdfUrls.push(pdfUrl)
              totalPdfSize += pdf.size
            } catch (uploadError) {
              console.error(`PDF ${pdf.name} upload failed:`, uploadError)
              toast.warning(`PDF 파일 "${pdf.name}" 업로드에 실패했습니다.`)
            }
          }

          // 4. Update recording with file info
          await recordingsDb.update(recording.id, {
            audio_url: audioUrl,
            pdf_url: pdfUrls.join(','),
            file_size_bytes: audioBlob.size,
            pdf_size_bytes: totalPdfSize
          })

          // 5. Save slide syncs
          for (const sync of updatedSlideSyncs) {
            await recordEntries.create(
              recording.id,
              sync.pdfFileName || '미선택',
              sync.slideNumber === 0 ? 1 : sync.slideNumber,
              sync.startTime,
              sync.endTime || '',
              sync.memo || ''
            )
          }

          toast.success('녹음이 성공적으로 저장되었습니다!')
          
          // Reset state
          setState({
            isRecording: false,
            isPaused: false,
            recordingTime: 0,
            recordingTitle: '',
            subjectId: '',
            subjectName: '',
            slideSyncs: [],
            currentSlideNumber: 1,
            selectedPdfIndex: -1,
            pdfFiles: [],
            totalSlides: 0,
            slideMemo: '',
            allSlideThumbnails: [],
            pdfLastPages: []
          })
          
          // Navigate to subject page
          router.push(`/subjects/${state.subjectId}`)
        } catch (error) {
          console.error('Save failed:', error)
          toast.error(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
        }
        
        resolve()
      }
    })
  }, [state, user, router])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    // Reset state
    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      recordingTitle: '',
      subjectId: '',
      subjectName: '',
      slideSyncs: [],
      currentSlideNumber: 1,
      selectedPdfIndex: -1,
      pdfFiles: [],
      totalSlides: 0,
      slideMemo: '',
      allSlideThumbnails: [],
      pdfLastPages: []
    })
    
    audioChunksRef.current = []
    startTimeRef.current = 0
    pausedTimeRef.current = 0
    pausedAtRef.current = 0
    
    toast.info('녹음이 취소되었습니다.')
  }, [])

  const markCurrentSlide = useCallback(() => {
    if (!state.isRecording) {
      toast.warning('먼저 녹음을 시작해주세요.')
      return
    }
    
    const currentTime = formatTime(state.recordingTime).display
    const lastSync = state.slideSyncs[state.slideSyncs.length - 1]
    
    if (lastSync && !lastSync.endTime) {
      // Update last sync with end time and memo
      const updatedSyncs = [...state.slideSyncs]
      updatedSyncs[updatedSyncs.length - 1] = {
        ...lastSync,
        endTime: currentTime,
        memo: state.slideMemo || lastSync.memo
      }
      
      // Create new sync
      let newSync: SlideSync
      if (state.selectedPdfIndex >= 0 && state.pdfFiles[state.selectedPdfIndex] && state.currentSlideNumber < state.totalSlides) {
        // Move to next slide
        setState(prev => ({ ...prev, currentSlideNumber: prev.currentSlideNumber + 1 }))
        newSync = {
          id: Date.now().toString(),
          pdfFileName: state.pdfFiles[state.selectedPdfIndex].name,
          slideNumber: state.currentSlideNumber + 1,
          startTime: currentTime,
          recordingTime: state.recordingTime,
          memo: ''
        }
      } else {
        // Keep same settings
        newSync = {
          id: Date.now().toString(),
          pdfFileName: state.selectedPdfIndex >= 0 && state.pdfFiles[state.selectedPdfIndex] 
            ? state.pdfFiles[state.selectedPdfIndex].name 
            : '',
          slideNumber: state.selectedPdfIndex >= 0 ? state.currentSlideNumber : 0,
          startTime: currentTime,
          recordingTime: state.recordingTime,
          memo: ''
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        slideSyncs: [...updatedSyncs, newSync],
        slideMemo: ''
      }))
    }
  }, [state])

  const navigateToRecordPage = useCallback(() => {
    if (state.subjectId) {
      router.push(`/subjects/${state.subjectId}/record`)
    }
  }, [state.subjectId, router])

  const value: RecordingContextType = {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    markCurrentSlide,
    updateRecordingTitle: (title) => setState(prev => ({ ...prev, recordingTitle: title })),
    updateSlideMemo: (memo) => setState(prev => ({ ...prev, slideMemo: memo })),
    setPdfFiles: (files) => setState(prev => ({ ...prev, pdfFiles: files })),
    setSelectedPdfIndex: (index) => setState(prev => ({ ...prev, selectedPdfIndex: index })),
    setCurrentSlideNumber: (number) => setState(prev => ({ ...prev, currentSlideNumber: number })),
    setTotalSlides: (total) => setState(prev => ({ ...prev, totalSlides: total })),
    setAllSlideThumbnails: (thumbnails) => setState(prev => ({ ...prev, allSlideThumbnails: thumbnails })),
    setPdfLastPages: (pages) => setState(prev => ({ ...prev, pdfLastPages: pages })),
    updateSlideSyncs: (syncs) => setState(prev => ({ ...prev, slideSyncs: syncs })),
    navigateToRecordPage
  }

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  )
}

export const useRecording = () => {
  const context = useContext(RecordingContext)
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider')
  }
  return context
}
