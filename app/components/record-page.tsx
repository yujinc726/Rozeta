'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Pause, RotateCcw, Upload, FileText, Mic, CheckCircle2, ChevronLeft, ChevronRight, Clock, Edit, X, Square, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { recordings as recordingsDb, recordEntries, storage } from '@/lib/database'
import { toast } from 'sonner'
import { getPdfPageCount, getPdfPageThumbnail } from '@/lib/pdf-utils'
import { processRecordingWithProgress } from '@/lib/ai-processor'

interface SlideSync {
  id: string
  pdfFileName: string
  slideNumber: number
  startTime: string
  endTime?: string
  recordingTime: number
  memo?: string
}

interface RecordPageProps {
  subjectName: string
  subjectId: string
  isSidebarCollapsed?: boolean
}

export default function RecordPage({ subjectName, subjectId, isSidebarCollapsed = false }: RecordPageProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])
  const [recordingTitle, setRecordingTitle] = useState(`${subjectName} ${new Date().toLocaleDateString('ko-KR')}`)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [selectedPdfIndex, setSelectedPdfIndex] = useState<number>(-1)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0) // milliseconds
  const [slideSyncs, setSlideSyncs] = useState<SlideSync[]>([])
  const [currentSlideNumber, setCurrentSlideNumber] = useState(1)
  const [totalSlides, setTotalSlides] = useState(0)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentSlideThumbnail, setCurrentSlideThumbnail] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [allSlideThumbnails, setAllSlideThumbnails] = useState<string[][]>([])
  const [slideMemo, setSlideMemo] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Timer logic
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = now - startTimeRef.current + pausedTimeRef.current
        setRecordingTime(elapsed)
      }, 10) // Update every 10ms for smooth millisecond display
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
  }, [isRecording, isPaused])

  // Update current slide thumbnail when PDF or slide changes
  useEffect(() => {
    if (selectedPdfIndex >= 0 && allSlideThumbnails[selectedPdfIndex] && currentSlideNumber > 0) {
      setCurrentSlideThumbnail(allSlideThumbnails[selectedPdfIndex][currentSlideNumber - 1])
    } else {
      setCurrentSlideThumbnail(null)
    }
  }, [selectedPdfIndex, currentSlideNumber, allSlideThumbnails])

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFiles(prev => [...prev, file])
      setSelectedPdfIndex(pdfFiles.length)
      
      try {
        // toast.info('PDF 파일을 분석하는 중...')
        const pageCount = await getPdfPageCount(file)
        setTotalSlides(pageCount)
        setCurrentSlideNumber(1)

        const thumbnails: string[] = []
        for (let i = 1; i <= pageCount; i++) {
          try {
            const thumbnail = await getPdfPageThumbnail(file, i, 3.0)
            thumbnails.push(thumbnail)
          } catch (error) {
            console.error(`슬라이드 ${i} 썸네일 생성 실패:`, error)
            thumbnails.push('')
          }
        }
        setAllSlideThumbnails(prev => [...prev, thumbnails])
        // toast.success(`${pageCount}개의 슬라이드를 감지했습니다.`)
      } catch (error) {
        console.error('PDF 페이지 수 계산 실패:', error)
        toast.error('PDF 파일을 읽을 수 없습니다.')
        setPdfFiles(prev => prev.slice(0, -1))
        setTotalSlides(0)
      }
    } else if (file) {
      toast.error('PDF 파일만 업로드 가능합니다.')
    }
  }

  const startRecording = async () => {
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
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      pausedAtRef.current = 0
      
      // 기존 기록 초기화 및 첫 슬라이드 자동 추가
      if (selectedPdfIndex >= 0 && pdfFiles[selectedPdfIndex]) {
        const firstSlide: SlideSync = {
          id: Date.now().toString(),
          pdfFileName: pdfFiles[selectedPdfIndex].name,
          slideNumber: currentSlideNumber,
          startTime: '00:00:00.000',
          recordingTime: 0,
          memo: ''
        }
        setSlideSyncs([firstSlide])
      } else {
        setSlideSyncs([])
      }
      
      // toast.success('녹음이 시작되었습니다!')
    } catch (error: any) {
      console.error('녹음 시작 실패:', error)
      if (error.name === 'NotAllowedError') {
        toast.error('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.')
      } else if (error.name === 'NotFoundError') {
        toast.error('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.')
      } else {
        toast.error(`마이크 접근 오류: ${error.message}`)
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsPaused(true)
      pausedAtRef.current = Date.now()
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      setIsPaused(false)
      const pauseDuration = Date.now() - pausedAtRef.current
      pausedTimeRef.current += pauseDuration
      startTimeRef.current = Date.now() - recordingTime + pausedTimeRef.current
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const currentTime = formatTime(recordingTime).display
      const updatedSlideSyncs = slideSyncs.map((sync, index) => {
        if (index === slideSyncs.length - 1 && !sync.endTime) {
          return { ...sync, endTime: currentTime }
        }
        return sync
      })
      setSlideSyncs(updatedSlideSyncs)
      
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        setIsRecording(false)
        setIsPaused(false)
        startTimeRef.current = 0
        pausedTimeRef.current = 0
        pausedAtRef.current = 0
        
        setIsSaving(true)
        
        try {
          console.log('저장 시작', {
            subjectId,
            recordingTitle,
            userId: user?.id,
            duration: Math.floor(recordingTime / 1000),
            slideSyncsCount: updatedSlideSyncs.length,
            pdfFilesCount: pdfFiles.length
          })
          
          // 1. 녹음 정보를 데이터베이스에 저장
          const recording = await recordingsDb.create(
            subjectId,
            recordingTitle,
            Math.floor(recordingTime / 1000) // seconds
          )
          
          // 2. 오디오 파일 업로드
          console.log('녹음 데이터 저장 완료, 오디오 업로드 시작...')
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
          let audioUrl = ''
          
          try {
            audioUrl = await storage.uploadAudio(audioFile, recording.id)
          } catch (uploadError) {
            console.error('오디오 업로드 실패, 녹음 데이터는 저장됨:', uploadError)
            toast.warning('녹음은 저장되었지만 오디오 파일 업로드에 실패했습니다. 나중에 다시 시도해주세요.')
            // 오디오 없이 계속 진행
          }
          
          // 3. PDF 파일들 업로드 및 크기 계산
          const pdfUrls: string[] = []
          let totalPdfSize = 0
          for (const [index, pdf] of pdfFiles.entries()) {
            try {
              const pdfUrl = await storage.uploadPDF(pdf, recording.id)
              pdfUrls.push(pdfUrl)
              totalPdfSize += pdf.size
            } catch (uploadError) {
              console.error(`PDF ${pdf.name} 업로드 실패:`, uploadError)
              toast.warning(`PDF 파일 "${pdf.name}" 업로드에 실패했습니다.`)
              // PDF 없이 계속 진행
            }
          }
          
          // 4. 녹음 정보 업데이트 (파일 크기 포함)
          await recordingsDb.update(recording.id, {
            audio_url: audioUrl,
            pdf_url: pdfUrls.join(','), // 여러 PDF URL을 콤마로 구분하여 저장
            file_size_bytes: audioBlob.size,
            pdf_size_bytes: totalPdfSize
          })
          
          // 5. 슬라이드 기록 저장
          for (const sync of updatedSlideSyncs) {
            await recordEntries.create(
              recording.id,
              sync.pdfFileName,
              sync.slideNumber,
              sync.startTime,
              sync.endTime || '',
              sync.memo || ''
            )
          }
          
          // toast.success('녹음이 성공적으로 저장되었습니다!')
          
          // 6. 메인 화면으로 돌아가기
          setTimeout(() => {
            router.push(`/subjects/${subjectId}`)
          }, 1500)
          
        } catch (error) {
          console.error('저장 실패:', error)
          if (error instanceof Error) {
            if (error.message.includes('Invalid URL')) {
              toast.error('Supabase 설정이 필요합니다. .env.local 파일을 확인해주세요.')
            } else {
              toast.error(`저장 중 오류가 발생했습니다: ${error.message}`)
            }
          } else {
            toast.error('저장 중 알 수 없는 오류가 발생했습니다.')
          }
        } finally {
          setIsSaving(false)
          setProcessingStep('')
          setProcessingProgress(0)
        }
      }
    }
  }

  const markCurrentSlide = () => {
    if (!isRecording) {
      // toast.warning('먼저 녹음을 시작해주세요.')
      return
    }
    
    if (selectedPdfIndex < 0 || !pdfFiles[selectedPdfIndex]) {
      // toast.warning('PDF 파일을 선택해주세요.')
      return
    }
    
    const currentTime = formatTime(recordingTime).display
    const lastSync = slideSyncs[slideSyncs.length - 1]
    
    if (lastSync && !lastSync.endTime) {
      // 현재 슬라이드의 종료 시간 기록
      const updatedSyncs = [...slideSyncs]
      updatedSyncs[updatedSyncs.length - 1] = {
        ...lastSync,
        endTime: currentTime,
        memo: slideMemo || lastSync.memo
      }
      setSlideSyncs(updatedSyncs)
      // toast.success(`슬라이드 ${lastSync.slideNumber} 종료 시간 기록`)
      
      // 다음 슬라이드가 있으면 자동으로 추가
      if (currentSlideNumber < totalSlides) {
        setCurrentSlideNumber(prev => prev + 1)
        const newSync: SlideSync = {
          id: Date.now().toString(),
          pdfFileName: pdfFiles[selectedPdfIndex].name,
          slideNumber: currentSlideNumber + 1,
          startTime: currentTime,
          recordingTime: recordingTime,
          memo: ''
        }
        setSlideSyncs([...updatedSyncs, newSync])
      }
      
      setSlideMemo('')
    } else {
      // toast.info('기록할 슬라이드가 없습니다.')
    }
  }

  const goToPrevSlide = () => {
    if (currentSlideNumber > 1) {
      setCurrentSlideNumber(prev => prev - 1)
    }
  }

  const goToNextSlide = () => {
    if (currentSlideNumber < totalSlides) {
      setCurrentSlideNumber(prev => prev + 1)
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header with Recording Title */}
        <div className="relative bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/60 shadow-sm">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                {isEditingTitle ? (
                  <Input
                    value={recordingTitle}
                    onChange={(e) => setRecordingTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTitle(false)
                      }
                    }}
                    className="w-auto min-w-0 max-w-fit h-auto bg-transparent border-0 p-0 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 shadow-none"
                    style={{ 
                      fontSize: '1.25rem',
                      fontWeight: '500',
                      lineHeight: '1.75rem',
                      color: 'rgb(15 23 42)',
                      fontFamily: 'inherit'
                    }}
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-xl font-medium cursor-pointer text-slate-900 hover:text-slate-700 hover:bg-slate-100/60 transition-all duration-200 rounded-sm inline-block"
                    onClick={() => setIsEditingTitle(true)}
                    title="클릭하여 수정"
                  >
                    {recordingTitle}
                  </h1>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-600">녹음 중</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Screen Slide Display */}
        <div className="flex-1 p-6 pb-48">
          <div className="h-full flex flex-col">
            {/* Compact PDF Upload Section */}
            <div className="mb-3 bg-white rounded-lg shadow-sm border p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <Button
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  강의안 추가
                </Button>
                
                <div className="w-px h-6 bg-gray-200" />
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  {/* 미선택 옵션 */}
                  <button
                        onClick={() => {
                          setSelectedPdfIndex(-1)
                          setCurrentSlideNumber(1)
                          setTotalSlides(0)
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all",
                          selectedPdfIndex === -1 
                            ? "bg-purple-100 text-purple-700 border border-purple-300" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                        )}
                      >
                        <X className="w-3 h-3" />
                        <span>미선택</span>
                        {selectedPdfIndex === -1 && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                      </button>
                      
                      {pdfFiles.map((file, index) => (
                        <button
                          key={index}
                          onClick={async () => {
                            setSelectedPdfIndex(index)
                            setCurrentSlideNumber(1)
                            try {
                              const pageCount = await getPdfPageCount(file)
                              setTotalSlides(pageCount)
                            } catch (error) {
                              console.error('PDF 페이지 수 계산 실패:', error)
                              setTotalSlides(0)
                            }
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all",
                            selectedPdfIndex === index 
                              ? "bg-purple-100 text-purple-700 border border-purple-300" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                          )}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          {selectedPdfIndex === index && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                        </button>
                      ))}
                </div>
              </div>
            </div>

            {/* Full Screen Slide Content */}
            <div className="flex-1 bg-white rounded-lg shadow-md relative overflow-hidden">
              {/* Slide Navigation */}
              {selectedPdfIndex >= 0 && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button
                    onClick={goToPrevSlide}
                    disabled={currentSlideNumber <= 1}
                    variant="outline"
                    size="sm"
                    className="bg-white/90 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={goToNextSlide}
                    disabled={currentSlideNumber >= totalSlides}
                    variant="outline"
                    size="sm"
                    className="bg-white/90 hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {currentSlideThumbnail ? (
                <>
                  <img 
                    src={currentSlideThumbnail} 
                    alt={`슬라이드 ${currentSlideNumber}`}
                    className="w-full h-full object-contain p-8"
                    style={{ maxHeight: 'calc(100vh - 250px)' }}
                  />
                  {selectedPdfIndex >= 0 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <div className="bg-black/30 hover:bg-black/70 text-white/70 hover:text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all duration-200 cursor-default">
                        <span className="text-sm font-medium">
                          {currentSlideNumber} / {totalSlides}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-16 text-gray-500">
                    <FileText className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl">강의안을 추가하고 선택하면</p>
                    <p className="text-lg">슬라이드가 여기에 표시됩니다</p>
                    <p className="text-sm text-gray-400 mt-2">강의안 없이도 녹음 가능합니다</p>
                  </div>
                </div>
              )}
            </div>

            {/* Records Table */}
            {slideSyncs.length > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    슬라이드 기록
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">강의안명</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">슬라이드 번호</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">시작 시간</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">종료 시간</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slideSyncs.map((sync, index) => (
                        <tr key={sync.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sync.pdfFileName}
                              onChange={(e) => {
                                const updated = [...slideSyncs]
                                updated[index] = { ...updated[index], pdfFileName: e.target.value }
                                setSlideSyncs(updated)
                              }}
                              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={sync.slideNumber}
                              onChange={(e) => {
                                const updated = [...slideSyncs]
                                updated[index] = { ...updated[index], slideNumber: parseInt(e.target.value) || 1 }
                                setSlideSyncs(updated)
                              }}
                              className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sync.startTime}
                              onChange={(e) => {
                                const updated = [...slideSyncs]
                                updated[index] = { ...updated[index], startTime: e.target.value }
                                setSlideSyncs(updated)
                              }}
                              className="w-32 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sync.endTime || ''}
                              onChange={(e) => {
                                const updated = [...slideSyncs]
                                updated[index] = { ...updated[index], endTime: e.target.value }
                                setSlideSyncs(updated)
                              }}
                              className="w-32 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="진행 중"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sync.memo || ''}
                              onChange={(e) => {
                                const updated = [...slideSyncs]
                                updated[index] = { ...updated[index], memo: e.target.value }
                                setSlideSyncs(updated)
                              }}
                              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="메모를 입력하세요"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Control and Memo Panel */}
        <div className={cn(
          "fixed bottom-0 right-0 z-40 bg-white border-t shadow-lg transition-all duration-300",
          isSidebarCollapsed ? "left-16" : "left-80"
        )}>
          <div className="px-6 py-3">
            <div className="flex gap-6">
              {/* Memo Section */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="w-4 h-4 text-purple-600" />
                  <Label htmlFor="slide-memo" className="text-sm font-semibold text-gray-700">
                    슬라이드 {currentSlideNumber} 메모
                  </Label>
                </div>
                <Textarea
                  id="slide-memo"
                  value={slideMemo}
                  onChange={(e) => setSlideMemo(e.target.value)}
                  placeholder="현재 슬라이드에 대한 중요한 내용이나 메모를 입력하세요..."
                  className="w-full min-h-[100px] max-h-[200px] resize-y"
                />
              </div>
              
              {/* Recording Controls */}
              <div className="w-80 border-l pl-6">
                <div className="space-y-3">
                  {/* Timer Display */}
                  <div className="text-center mb-2">
                    <div className="text-3xl font-mono font-bold text-gray-900">
                      {formatTime(recordingTime).display}
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="space-y-2">
                    {!isRecording ? (
                      <>
                        <Button
                          onClick={startRecording}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          disabled={pdfFiles.length === 0}
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          녹음 시작
                        </Button>

                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={isPaused ? resumeRecording : pauseRecording}
                            variant="outline"
                            className="w-full"
                          >
                            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                            {isPaused ? '재개' : '일시정지'}
                          </Button>
                          <Button
                            onClick={markCurrentSlide}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            시간 기록
                          </Button>
                        </div>
                        <Button
                          onClick={stopRecording}
                          variant="destructive"
                          className="w-full"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          종료
                        </Button>
                      </>
                    )}</div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Processing overlay */}
      {(isSaving || isProcessing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-6"></div>
              
              {isProcessing ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI가 강의를 분석하고 있습니다</h3>
                  <p className="text-gray-600 text-center mb-4">{processingStep}</p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">{processingProgress}% 완료</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">녹음을 저장하는 중...</h3>
                  <p className="text-gray-600 text-center">잠시만 기다려주세요</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 