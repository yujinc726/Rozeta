"use client"

import { useState, useRef, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Save, X, Play, Pause, Wand2, FileAudio, Brain, AlertCircle, FileText, Clock, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { toast } from "sonner"
import { recordEntries, recordings } from "@/lib/database"
import type { Recording as DbRecording, RecordEntry } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import WhisperProcessor from "./whisper-processor"
import { extractTranscriptBySlides, getCurrentSubtitle } from "@/lib/transcript-utils"
import { useSidebarContext } from "@/app/contexts/sidebar-context"
import { SlideAIExplanation } from "./ai-explanation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSubtitleSettings } from "@/app/contexts/subtitle-settings-context"

interface RecordDetailProps {
  recording: DbRecording
  onOpenWhisper?: () => void
  onOpenAIExplanation?: () => void
}

export default function RecordDetail({ recording, onOpenWhisper, onOpenAIExplanation }: RecordDetailProps) {
  const { isSidebarCollapsed } = useSidebarContext()
  const { settings: subtitleSettings } = useSubtitleSettings()
  const router = useRouter()
  const [recordEntriesList, setRecordEntriesList] = useState<RecordEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<RecordEntry | null>(null)
  const [editedData, setEditedData] = useState<RecordEntry | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(recording.duration || 0)
  const [loading, setLoading] = useState(true)
  const [currentEntry, setCurrentEntry] = useState<RecordEntry | null>(null)
  const [currentSlideImage, setCurrentSlideImage] = useState<string | null>(null)
  const [slideLoading, setSlideLoading] = useState(false)
  const [showWhisperDialog, setShowWhisperDialog] = useState(false)
  const [slideTranscripts, setSlideTranscripts] = useState<Array<{
    slideNumber: number;
    startTime: string;
    endTime: string | undefined;
    transcript: string;
  }>>([])
  const [showTranscripts, setShowTranscripts] = useState(true)
  const [showLiveSubtitle, setShowLiveSubtitle] = useState(true)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(recording.title)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiOverview, setAiOverview] = useState<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number | null>(null)

  // 슬라이드 기록 불러오기
  useEffect(() => {
    loadRecordEntries()
  }, [recording.id])

  // 자막을 슬라이드별로 분할
  useEffect(() => {
    if (recording.transcript && recordEntriesList.length > 0) {
      const slideSyncs = recordEntriesList.map(entry => ({
        slideNumber: entry.slide_number,
        startTime: entry.start_time,
        endTime: entry.end_time
      }))
      
      const transcripts = extractTranscriptBySlides(recording.transcript, slideSyncs)
      setSlideTranscripts(transcripts)
    }
  }, [recording.transcript, recordEntriesList])

  // 현재 재생 시간에 해당하는 자막 찾기
  useEffect(() => {
    if (recording.subtitles && isPlaying) {  // subtitles 사용
      const updateSubtitle = () => {
        if (audioRef.current && !audioRef.current.paused && recording.subtitles) {
          const subtitle = getCurrentSubtitle(recording.subtitles, audioRef.current.currentTime)
          setCurrentSubtitle(subtitle)
        }
      }
      
      // 초기 자막 설정
      updateSubtitle()
      
      // 자막 업데이트는 updateProgress와 함께 처리되므로 별도 interval 불필요
    } else if (!isPlaying) {
      setCurrentSubtitle('')
    }
  }, [recording.subtitles, isPlaying])

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToPreviousSlide()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNextSlide()
          break
        case ' ': // 스페이스바로 재생/일시정지
          e.preventDefault()
          togglePlayPause()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentEntry, recordEntriesList, isPlaying])

  // 오디오 URL 변경 시 duration 리셋
  useEffect(() => {
    console.log('Audio URL:', recording.audio_url)
    console.log('Recording duration from DB:', recording.duration)
    
    if (recording.audio_url && audioRef.current) {
      // recording에 duration이 있으면 그것을 먼저 사용
      if (recording.duration && recording.duration > 0) {
        setDuration(recording.duration)
      }
      
      setCurrentTime(0)
      setIsPlaying(false)
      
      // 오디오 엘리먼트가 새 URL을 로드하도록 강제
      audioRef.current.load()
      
      // URL이 실제로 유효한지 확인
      console.log('Audio element src:', audioRef.current.src)
      console.log('Audio element readyState:', audioRef.current.readyState)
    }
  }, [recording.audio_url, recording.duration])

  // 현재 재생 시간에 해당하는 슬라이드 찾기
  useEffect(() => {
    if (recordEntriesList.length === 0) return

    const timeStr = formatTimeFromSeconds(currentTime)
    const currentSlide = recordEntriesList.find(entry => {
      const startTime = parseTimeToSeconds(entry.start_time)
      const endTime = entry.end_time ? parseTimeToSeconds(entry.end_time) : Infinity
      const currentSec = currentTime
      return currentSec >= startTime && currentSec < endTime
    })

    if (currentSlide && currentSlide.id !== currentEntry?.id) {
      setCurrentEntry(currentSlide)
      // PDF에서 슬라이드 이미지 가져오기 (TODO: 실제 PDF 렌더링 구현 필요)
      loadSlideImage(currentSlide)
    }
  }, [currentTime, recordEntriesList, currentEntry?.id])

  // 시간 문자열을 초 단위로 변환
  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0] || '0')
    const minutes = parseInt(parts[1] || '0')
    const secondsParts = parts[2]?.split('.') || ['0', '0']
    const seconds = parseInt(secondsParts[0])
    const milliseconds = parseInt(secondsParts[1] || '0')
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  }

  // 초를 시간 문자열로 변환
  const formatTimeFromSeconds = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) {
      return '00:00:00.000'
    }
    
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  // 슬라이드 이미지 로드
  const loadSlideImage = async (entry: RecordEntry) => {
    try {
      setSlideLoading(true)
      
      // PDF URL에서 슬라이드 렌더링
      const pdfUrls = recording.pdf_url ? recording.pdf_url.split(',') : []
      if (pdfUrls.length > 0) {
        // Supabase Storage URL에서 직접 렌더링
        const pdfUrl = pdfUrls[0] // 첫 번째 PDF 사용 (TODO: entry.material_name으로 매칭)
        
        // PDF.js를 사용하여 슬라이드 이미지 생성
        const pdfjs = await import('pdfjs-dist')
        
        // Worker 설정
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
        
        // PDF 로드 (CORS 설정 포함)
        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: false,
          verbosity: 0, // 콘솔 로그 최소화
          cMapUrl: '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
        })
        
        const pdf = await loadingTask.promise
        
        // 페이지 번호 검증
        if (entry.slide_number < 1 || entry.slide_number > pdf.numPages) {
          throw new Error(`Invalid slide number: ${entry.slide_number}`)
        }
        
        const page = await pdf.getPage(entry.slide_number)
        
        // Canvas 생성 및 렌더링
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        const viewport = page.getViewport({ scale: 2.0 }) // 고화질을 위해 scale 2.0
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        // 고화질 렌더링 설정
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        
        // 페이지 렌더링
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          intent: 'display'
        }
        
        await page.render(renderContext).promise
        
        // Canvas를 이미지로 변환
        const imageUrl = canvas.toDataURL('image/jpeg', 0.95)
        setCurrentSlideImage(imageUrl)
        
        // 메모리 정리
        page.cleanup()
      } else {
        // PDF가 없으면 placeholder 사용
        setCurrentSlideImage(`https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Slide+${entry.slide_number}`)
      }
    } catch (error) {
      console.error('Failed to load slide image:', error)
      // 에러 시 placeholder 사용
      setCurrentSlideImage(`https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Slide+${entry.slide_number}`)
    } finally {
      setSlideLoading(false)
    }
  }

  const loadRecordEntries = async () => {
    try {
      const entries = await recordEntries.getByRecordingId(recording.id)
      setRecordEntriesList(entries)
      
      // 첫 번째 슬라이드를 현재 슬라이드로 설정
      if (entries.length > 0 && !currentEntry) {
        setCurrentEntry(entries[0])
        loadSlideImage(entries[0])
      }
      
      // AI 설명이 이미 있는지 확인
      if (recording.ai_lecture_overview) {
        setAiOverview(recording.ai_lecture_overview)
      }
    } catch (error) {
      console.error('Failed to load record entries:', error)
      toast.error('슬라이드 기록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // AI 설명 생성/재생성 함수
  const generateAIExplanations = async (regenerate = false) => {
    try {
      setIsGeneratingAI(true)
      
      // 사용자 인증 정보 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('로그인이 필요합니다.')
      }
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          recordingId: recording.id,
          regenerate
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'AI 분석 실패')
      }

      const data = await response.json()
      
      if (data.success) {
        // 업데이트된 엔트리 목록 갱신
        setRecordEntriesList(data.entries)
        setAiOverview(data.overview)
        
        // recording 객체도 업데이트
        if (data.overview) {
          recording.ai_lecture_overview = data.overview
        }
        
        // currentEntry도 업데이트 (현재 보고 있는 슬라이드의 AI 설명이 보이도록)
        if (currentEntry && data.entries) {
          const updatedCurrentEntry = data.entries.find(e => e.id === currentEntry.id)
          if (updatedCurrentEntry) {
            setCurrentEntry(updatedCurrentEntry)
          }
        }
        
        toast.success('AI 분석이 완료되었습니다!')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      if (error instanceof Error && error.message.includes('GOOGLE_GEMINI_API_KEY')) {
        toast.error('Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GOOGLE_GEMINI_API_KEY를 추가해주세요.')
      } else {
        toast.error(error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다.')
      }
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== recording.title) {
      try {
        await recordings.update(recording.id, { title: editedTitle.trim() })
        recording.title = editedTitle.trim() // 로컬 상태 업데이트
        toast.success('제목이 수정되었습니다.')
      } catch (error) {
        console.error('Failed to update title:', error)
        toast.error('제목 수정에 실패했습니다.')
        setEditedTitle(recording.title) // 원래 제목으로 복원
      }
    }
    setIsEditingTitle(false)
  }

  const handleEdit = (entry: RecordEntry) => {
    setEditingEntry(entry)
    setEditedData({ ...entry })
  }

  const handleSave = async () => {
    if (!editedData || !editingEntry) return

    try {
      await recordEntries.update(editingEntry.id, {
        material_name: editedData.material_name,
        slide_number: editedData.slide_number,
        start_time: editedData.start_time,
        end_time: editedData.end_time,
        memo: editedData.memo
      })
      
      await loadRecordEntries()
      setEditingEntry(null)
      setEditedData(null)
      // toast.success('수정되었습니다.')
    } catch (error) {
      console.error('Failed to update entry:', error)
      toast.error('수정에 실패했습니다.')
    }
  }

  const handleCancel = () => {
    setEditingEntry(null)
    setEditedData(null)
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // 재생 진행 상황 업데이트 - onTimeUpdate 이벤트에서 처리
  const updateProgress = () => {
    if (audioRef.current) {
      const currentAudioTime = audioRef.current.currentTime
      if (isFinite(currentAudioTime)) {
        setCurrentTime(currentAudioTime)
        
        // 자막 업데이트
        if (recording.subtitles) {  // subtitles 사용
          const subtitle = getCurrentSubtitle(recording.subtitles, currentAudioTime)
          setCurrentSubtitle(subtitle)
        }
      }
    }
  }

  // 오디오 메타데이터 로드 시
  const handleLoadedMetadata = () => {
    console.log('handleLoadedMetadata called')
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration
      console.log('Audio metadata loaded, duration:', audioDuration, 'readyState:', audioRef.current.readyState)
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration)
      } else {
        // duration이 아직 준비되지 않았다면 잠시 후 다시 시도
        setTimeout(() => {
          if (audioRef.current) {
            const retryDuration = audioRef.current.duration
            console.log('Retry getting duration:', retryDuration)
            if (isFinite(retryDuration) && retryDuration > 0) {
              setDuration(retryDuration)
            }
          }
        }, 100)
      }
    }
  }

  // 오디오가 재생 가능한 상태가 되었을 때
  const handleCanPlay = () => {
    console.log('handleCanPlay called')
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration
      console.log('Audio can play, duration:', audioDuration, 'readyState:', audioRef.current.readyState)
      if (isFinite(audioDuration) && audioDuration > 0 && duration === 0) {
        setDuration(audioDuration)
      }
    }
  }

  // duration 변경 시
  const handleDurationChange = () => {
    console.log('handleDurationChange called')
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration
      console.log('Duration changed:', audioDuration, 'readyState:', audioRef.current.readyState)
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration)
      }
    }
  }

  // 데이터가 로드될 때
  const handleLoadedData = () => {
    console.log('handleLoadedData called')
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration
      console.log('Audio data loaded, duration:', audioDuration, 'readyState:', audioRef.current.readyState)
      if (isFinite(audioDuration) && audioDuration > 0 && duration === 0) {
        setDuration(audioDuration)
      }
    }
  }

  // 재생 종료 시
  const handleEnded = () => {
    setIsPlaying(false)
  }

  const seekToTime = (timeString: string) => {
    if (!audioRef.current) return
    
    try {
      const parts = timeString.split(':')
      if (parts.length !== 3) return
      
      const hours = parseInt(parts[0]) || 0
      const minutes = parseInt(parts[1]) || 0
      const secondsParts = parts[2].split('.')
      const seconds = parseInt(secondsParts[0]) || 0
      const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3)) : 0
      
      const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
      
      // 값 검증
      if (!isFinite(totalSeconds) || totalSeconds < 0) return
      if (duration > 0 && totalSeconds > duration) return
      
      // 정확한 시간 탐색을 위해 일시적으로 멈춤
      const wasPlaying = !audioRef.current.paused
      
      // currentTime 설정 후 약간의 지연을 두어 정확성 향상
      audioRef.current.currentTime = totalSeconds
      
      // UI 즉시 업데이트
      setCurrentTime(totalSeconds)
      
      // 자동 재생 (이전에 재생 중이었거나, 사용자가 시간을 클릭한 경우)
      if (wasPlaying || !isPlaying) {
        setTimeout(() => {
          audioRef.current?.play().then(() => {
            setIsPlaying(true)
          }).catch(e => console.error('Error starting playback:', e))
        }, 50)
      }
    } catch (error) {
      console.error('Failed to seek to time:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}시간 ${m}분 ${s}초`
  }

  // 현재 슬라이드의 인덱스 찾기
  const getCurrentEntryIndex = () => {
    if (!currentEntry || recordEntriesList.length === 0) return -1
    return recordEntriesList.findIndex(entry => entry.id === currentEntry.id)
  }

  // 이전 슬라이드로 이동
  const goToPreviousSlide = () => {
    const currentIndex = getCurrentEntryIndex()
    if (currentIndex > 0) {
      const previousEntry = recordEntriesList[currentIndex - 1]
      setCurrentEntry(previousEntry)
      loadSlideImage(previousEntry)
      seekToTime(previousEntry.start_time)
    }
  }

  // 다음 슬라이드로 이동
  const goToNextSlide = () => {
    const currentIndex = getCurrentEntryIndex()
    if (currentIndex >= 0 && currentIndex < recordEntriesList.length - 1) {
      const nextEntry = recordEntriesList[currentIndex + 1]
      setCurrentEntry(nextEntry)
      loadSlideImage(nextEntry)
      seekToTime(nextEntry.start_time)
    }
  }

  const hasTranscript = recording.transcript !== null && recording.transcript !== undefined
  const hasAIAnalysis = recordEntriesList.some(entry => 
    entry.ai_explanation && Object.keys(entry.ai_explanation).length > 0
  )

  // PDF URLs 파싱
  const pdfUrls = recording.pdf_url ? recording.pdf_url.split(',') : []

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 border-b border-slate-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-5">
                        {isEditingTitle ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTitleSave()
                    }
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false)
                      setEditedTitle(recording.title)
                    }
                  }}
                  className="w-auto min-w-0 max-w-fit h-auto bg-transparent border-0 p-0 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 shadow-none"
                  style={{ 
                    fontSize: '1.5rem',
                    fontWeight: '500',
                    lineHeight: '2rem',
                    color: 'rgb(15 23 42)',
                    fontFamily: 'inherit'
                  }}
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-2xl font-medium text-slate-900 dark:text-gray-100 cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/60 dark:hover:bg-gray-800/60 transition-all duration-200 rounded-sm inline-block"
                  onClick={() => {
                    setIsEditingTitle(true)
                    setEditedTitle(recording.title)
                  }}
                  title="클릭하여 수정"
                >
                  {recording.title}
                </h1>
              )}
          <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(recording.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  weekday: 'short',
                  month: 'numeric', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}</span>
              </div>
            {recording.duration && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-sm text-slate-500">
                  {formatDuration(recording.duration)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI 처리 상태 카드 */}
      <div className="p-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* 음성 텍스트 변환 카드 */}
          <Card className={hasTranscript ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${hasTranscript ? "bg-green-100 dark:bg-green-800" : "bg-orange-100 dark:bg-orange-800"}`}>
                    <FileAudio className={`w-6 h-6 ${hasTranscript ? "text-green-600 dark:text-green-300" : "text-orange-600 dark:text-orange-300"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI 자막 · 텍스트 생성</CardTitle>
                    <CardDescription>
                      {hasTranscript ? "생성 완료" : "아직 생성되지 않음"}
                    </CardDescription>
                  </div>
                </div>
                {hasTranscript ? (
                  <Badge className="bg-green-600">완료</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-600 text-white">대기</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {hasTranscript
                    ? "이미 텍스트 생성이 완료되었습니다. 프롬프트를 수정하여 다시 시도할 수 있습니다."
                    : "음성을 텍스트로 생성하면 AI가 강의 내용을 분석하고 요약해드립니다."}
                </p>
                <Button 
                  onClick={() => setShowWhisperDialog(true)}
                  className={`w-full bg-gradient-to-r ${
                    hasTranscript
                      ? 'from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600'
                      : 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                  }`}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {hasTranscript ? "자막 · 텍스트 다시 생성" : "AI 자막 · 텍스트 생성"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI 설명 카드 */}
          <Card className={hasAIAnalysis ? "border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700"}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${hasAIAnalysis ? "bg-purple-100 dark:bg-purple-800" : "bg-gray-100 dark:bg-gray-700"}`}>
                    <Brain className={`w-6 h-6 ${hasAIAnalysis ? "text-purple-600 dark:text-purple-300" : "text-gray-400 dark:text-gray-500"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI 강의 설명</CardTitle>
                    <CardDescription>
                      {hasAIAnalysis ? "분석 완료" : hasTranscript ? "분석 가능" : "텍스트 생성 필요"}
                    </CardDescription>
                  </div>
                </div>
                {hasAIAnalysis ? (
                  <Badge className="bg-purple-600">완료</Badge>
                ) : hasTranscript ? (
                  <Badge variant="secondary">준비됨</Badge>
                ) : (
                  <Badge variant="outline">대기</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hasAIAnalysis ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    AI가 강의 내용을 분석했습니다. 슬라이드별 설명을 확인하세요.
                  </p>
                  <Button 
                    onClick={() => generateAIExplanations(false)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    {isGeneratingAI ? 'AI 분석 중...' : 'AI 설명 보기'}
                  </Button>
                </div>
              ) : hasTranscript ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    텍스트 생성이 완료되어 AI 분석을 시작할 수 있습니다.
                  </p>
                  <Button 
                    onClick={() => generateAIExplanations(false)}
                    variant="outline"
                    className="w-full"
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    {isGeneratingAI ? 'AI 분석 중...' : 'AI 분석 시작하기'}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                                          AI 강의 설명을 생성하려면 먼저 <strong>AI 자막 · 텍스트 생성</strong>을 완료해주세요.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 녹음 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">



        </div>

        {/* 현재 슬라이드 표시 - 컴팩트 버전 */}
        {currentEntry && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>슬라이드</span>
                  <Badge variant="outline" className="ml-2">
                    {getCurrentEntryIndex() + 1} / {recordEntriesList.length}
                  </Badge>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">← → 키로 이동</span>
              </CardTitle>
              <CardDescription>
                {currentEntry.material_name === '미선택' ? 
                  '미선택' : 
                  currentEntry.material_name
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 왼쪽: 슬라이드 이미지 */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden group">
                  {slideLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-gray-500">로딩 중...</p>
                      </div>
                    </div>
                  ) : currentEntry.material_name === '미선택' ? (
                    <>
                      {/* 미선택 상태 표시 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50/80 to-slate-50/80 dark:from-gray-800/20 dark:to-slate-800/20">
                        <div className="text-center space-y-3">
                          <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500" />
                          <div>
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">미선택 구간</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">강의안 없이 진행된 구간입니다</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 슬라이드 네비게이션 버튼 */}
                      <div className="absolute inset-y-0 left-0 flex items-center">
                        <Button
                          onClick={goToPreviousSlide}
                          disabled={getCurrentEntryIndex() <= 0}
                          size="icon"
                          variant="ghost"
                            className="ml-1 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                      </div>
                      
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <Button
                          onClick={goToNextSlide}
                          disabled={getCurrentEntryIndex() >= recordEntriesList.length - 1}
                          size="icon"
                          variant="ghost"
                            className="mr-1 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </>
                  ) : currentSlideImage ? (
                    <>
                      <img
                        src={currentSlideImage}
                        alt={`슬라이드 ${currentEntry.slide_number}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Image load error')
                            e.currentTarget.src = `https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Slide+${currentEntry.slide_number}`
                        }}
                      />
                      
                      {/* 슬라이드 네비게이션 버튼 */}
                      <div className="absolute inset-y-0 left-0 flex items-center">
                        <Button
                          onClick={goToPreviousSlide}
                          disabled={getCurrentEntryIndex() <= 0}
                          size="icon"
                          variant="ghost"
                            className="ml-1 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                      </div>
                      
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <Button
                          onClick={goToNextSlide}
                          disabled={getCurrentEntryIndex() >= recordEntriesList.length - 1}
                          size="icon"
                          variant="ghost"
                            className="mr-1 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-xs text-gray-500">슬라이드를 불러올 수 없습니다</p>
                    </div>
                  )}
                </div>
                
                {/* 시간 정보 */}
                  <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
                  <span>시작: {currentEntry.start_time}</span>
                  {currentEntry.end_time && <span>종료: {currentEntry.end_time}</span>}
                  </div>
                </div>

                {/* 오른쪽: 메모 */}
                <div className="lg:col-span-1 space-y-4">
                  {/* 메모 */}
                  {currentEntry.memo ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                          <Edit className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">메모</h4>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-6 font-medium whitespace-pre-wrap">
                          {currentEntry.memo}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <Edit className="w-8 h-8 text-gray-300 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">이 슬라이드의 메모가 없습니다</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI 설명 표시 */}
              {currentEntry && (
                <div className="mt-4">
                  {hasTranscript ? (
                    <SlideAIExplanation
                      explanation={currentEntry.ai_explanation}
                      slideNumber={currentEntry.slide_number}
                      isGenerating={isGeneratingAI}
                      generatedAt={currentEntry.ai_generated_at}
                      onRegenerate={() => generateAIExplanations(true)}
                    />
                  ) : (
                    <Card className="border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-gray-400" />
                          AI 강의 설명
                        </CardTitle>
                        <CardDescription>
                          텍스트 생성 필요
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            AI 강의 설명을 보려면 먼저 <strong>AI 자막 · 텍스트 생성</strong>을 완료해주세요.
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 슬라이드 기록 테이블 */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                슬라이드 기록
                <Badge variant="outline">{recordEntriesList.length}개</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {recording.transcript && (
                  <Button
                    onClick={() => setShowTranscripts(!showTranscripts)}
                    size="sm"
                    variant="outline"
                    className="gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <FileText className="w-4 h-4" />
                    강의 내용 {showTranscripts ? '숨기기' : '보기'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                기록을 불러오는 중...
              </div>
            ) : recordEntriesList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                슬라이드 기록이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                    {recordEntriesList.map((entry) => {
                      const slideTranscript = slideTranscripts.find(
                        st => st.slideNumber === entry.slide_number
                      )
                      
                      return (
                    <div key={entry.id} className={`relative rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                      currentEntry?.id === entry.id 
                        ? 'bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-600 shadow-lg' 
                        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                            }`}
                            onClick={() => {
                              if (editingEntry?.id !== entry.id) {
                                // 해당 슬라이드로 이동
                                setCurrentEntry(entry)
                                loadSlideImage(entry)
                                // 시작 시간으로 이동
                                seekToTime(entry.start_time)
                              }
                    }}>
                      
                      {/* 슬라이드 정보 헤더 */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={currentEntry?.id === entry.id ? 'default' : 'secondary'} className="text-sm font-medium">
                              슬라이드 {entry.slide_number}
                            </Badge>
                            <span className="text-gray-400 dark:text-gray-500">•</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{entry.material_name}</span>
                            <span className="text-gray-400 dark:text-gray-500">•</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                seekToTime(entry.start_time)
                              }}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              {entry.start_time}
                            </button>
                            {entry.end_time && (
                              <>
                                <span className="text-gray-400 dark:text-gray-500">~</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    seekToTime(entry.end_time!)
                                  }}
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                  {entry.end_time}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {currentEntry?.id === entry.id && isPlaying && (
                            <div className="flex items-center gap-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-purple-400 dark:bg-purple-300 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-purple-400 dark:bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-purple-400 dark:bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 text-xs px-2 py-1">
                                재생 중
                              </Badge>
                            </div>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(entry)
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 dark:hover:bg-gray-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 편집 모드 */}
                      {editingEntry?.id === entry.id && (
                        <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="material_name" className="text-sm font-medium">강의안명</Label>
                              <Input
                                id="material_name"
                                value={editedData?.material_name || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, material_name: e.target.value} : null)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="slide_number" className="text-sm font-medium">슬라이드 번호</Label>
                              <Input
                                id="slide_number"
                                type="number"
                                value={editedData?.slide_number || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, slide_number: parseInt(e.target.value)} : null)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="start_time" className="text-sm font-medium">시작 시간</Label>
                              <Input
                                id="start_time"
                                value={editedData?.start_time || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, start_time: e.target.value} : null)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="end_time" className="text-sm font-medium">종료 시간</Label>
                              <Input
                                id="end_time"
                                value={editedData?.end_time || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, end_time: e.target.value} : null)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="memo" className="text-sm font-medium">메모</Label>
                            <Textarea
                              id="memo"
                                value={editedData?.memo || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, memo: e.target.value} : null)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                                <Button
                                  onClick={handleCancel}
                                  size="sm"
                              variant="outline"
                              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                              <X className="w-4 h-4 mr-1" />
                              취소
                                </Button>
                                <Button
                              onClick={handleSave}
                                  size="sm"
                                >
                              <Save className="w-4 h-4 mr-1" />
                              저장
                                </Button>
                              </div>
                        </div>
                      )}

                      {/* 메모 및 자막 */}
                      {!editingEntry && (
                        <div className="p-4 space-y-4">
                          {/* 메모 */}
                          {entry.memo && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                                                <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-lg">
                                  <Edit className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                              </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">메모</span>
                              </div>
                              <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700 rounded-lg p-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.memo}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* 자막 */}
                          {slideTranscript?.transcript && showTranscripts && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-100 dark:bg-purple-800 rounded-lg">
                                  <FileText className="w-3 h-3 text-purple-600 dark:text-purple-300" />
                              </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">강의 내용</span>
                              </div>
                              
                              <div className="relative">
                                <div className="absolute top-2 left-2 text-lg opacity-20 text-purple-400">"</div>
                                <div className={`p-4 pl-6 rounded-lg border ${
                                currentEntry?.id === entry.id 
                                    ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-700' 
                                    : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                              }`}>
                                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-6 font-medium tracking-wide whitespace-pre-wrap">
                                  {slideTranscript.transcript}
                                </p>
                              </div>
                                <div className="absolute bottom-2 right-2 text-lg opacity-20 text-purple-400 rotate-180">"</div>
                            </div>
                            </div>
                          )}
                          
                          {/* AI 설명 표시 배지 */}
                          {entry.ai_explanation && Object.keys(entry.ai_explanation).length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
                                <Brain className="w-3 h-3 mr-1" />
                                AI 설명 생성됨
                              </Badge>
                              {entry.ai_generated_at && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(entry.ai_generated_at).toLocaleTimeString('ko-KR')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 하단 장식 라인 */}
                      {currentEntry?.id === entry.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400/30 dark:via-purple-300/40 to-transparent rounded-b-xl"></div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 실시간 자막 */}
      {recording.subtitles && currentSubtitle && isPlaying && showLiveSubtitle && (
        <div 
          className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-5xl px-8 z-50 transition-all duration-300 ease-out`}
        >
          <div className="text-center">
            <div 
              className="inline-block px-4 py-2 rounded-lg shadow-lg"
              style={{
                backgroundColor: `${subtitleSettings.backgroundColor}${Math.round(subtitleSettings.backgroundOpacity * 2.55).toString(16).padStart(2, '0')}`,
                color: subtitleSettings.textColor,
                fontSize: `${subtitleSettings.fontSize}px`,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                lineHeight: 1.4,
                fontWeight: 400,
                letterSpacing: '0.02em'
              }}
            >
              {currentSubtitle}
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 오디오 플레이어 */}
      {recording.audio_url && (
        <div 
          className="fixed bottom-0 bg-white border-t border-gray-200 shadow-lg backdrop-blur-sm z-40 transition-all duration-300"
          style={{
            left: isSidebarCollapsed ? '4rem' : '20rem',
            right: 0,
            width: isSidebarCollapsed ? 'calc(100vw - 4rem)' : 'calc(100vw - 20rem)'
          }}
        >
          <audio
            ref={audioRef}
            src={recording.audio_url}
            crossOrigin="anonymous"
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={handleLoadedData}
            onCanPlay={handleCanPlay}
            onCanPlayThrough={handleCanPlay}
            onDurationChange={handleDurationChange}
            onTimeUpdate={(e) => {
              // 재생 진행 상황 업데이트
              updateProgress()
              
              // duration이 아직 설정되지 않았다면 여기서도 시도
              if (duration === 0 && audioRef.current) {
                const audioDuration = audioRef.current.duration
                if (isFinite(audioDuration) && audioDuration > 0) {
                  console.log('Setting duration from onTimeUpdate:', audioDuration)
                  setDuration(audioDuration)
                }
              }
            }}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('Audio loading error:', e)
              const audio = e.currentTarget as HTMLAudioElement
              console.error('Error code:', audio.error?.code)
              console.error('Error message:', audio.error?.message)
            }}
            preload="auto"
            className="hidden"
          />
          
          <div className="w-full px-6 py-3">
            <div className="flex items-center gap-6">
              {/* 현재 재생 정보 */}
              <div className="flex items-center gap-3 min-w-0 w-72">
                <div className="shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="headphone-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h0c1.66 0 3-1.34 3-3v-3c0-1.66-1.34-3-3-3H4.5v-1a7.5 7.5 0 0 1 15 0v1H18c-1.66 0-3 1.34-3 3v3c0 1.66 1.34 3 3 3h0c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z" 
                      fill="url(#headphone-gradient)"
                    />
                  </svg>
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {recording.title}
                  </p>
                  {currentEntry && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      슬라이드 {currentEntry.slide_number}
                    </p>
                  )}
                </div>
              </div>

              {/* 진행 바와 재생 컨트롤 */}
              <div className="flex items-center gap-3 flex-1 max-w-3xl mx-auto">
                {/* 재생/일시정지 버튼 */}
                <Button
                  onClick={togglePlayPause}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <span className="text-xs text-gray-500 tabular-nums shrink-0">
                  {formatTimeFromSeconds(currentTime).substring(0, 8)}
                </span>
                
                <div 
                  className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    if (audioRef.current && duration > 0 && isFinite(duration)) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const clickX = e.clientX - rect.left
                      const percent = clickX / rect.width
                      
                      // 값 검증
                      if (isFinite(percent) && percent >= 0 && percent <= 1) {
                        const newTime = percent * duration
                        if (isFinite(newTime) && newTime >= 0 && newTime <= duration) {
                          // 재생 상태 저장
                          const wasPlaying = !audioRef.current.paused
                          
                          // 시간 설정
                          audioRef.current.currentTime = newTime
                          setCurrentTime(newTime)
                          
                          // 재생 중이었다면 계속 재생
                          if (wasPlaying && audioRef.current.paused) {
                            audioRef.current.play().catch(e => console.error('Error resuming playback:', e))
                          }
                        }
                      }
                    }
                  }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100 pointer-events-none"
                    style={{ 
                      width: `${
                        duration > 0 && isFinite(duration) && isFinite(currentTime) 
                          ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
                          : 0
                      }%` 
                    }}
                  />
                </div>
                
                <span className="text-xs text-gray-500 tabular-nums shrink-0">
                  {formatTimeFromSeconds(duration).substring(0, 8)}
                </span>
              </div>

              {/* 추가 컨트롤 */}
              <div className="flex items-center gap-2">
                {recording.subtitles && (
                  <Button
                    onClick={() => setShowLiveSubtitle(!showLiveSubtitle)}
                    size="sm"
                    variant="ghost"
                    className={`group gap-1 text-xs hover:bg-transparent ${showLiveSubtitle ? '' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <FileText className={`w-3 h-3 transition-colors ${
                      showLiveSubtitle 
                        ? 'text-purple-500 group-hover:text-purple-600' 
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`} />
                    <span className={showLiveSubtitle 
                      ? 'font-medium bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-pink-600 transition-all' 
                      : 'transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }>
                      실시간 자막
                    </span>
                  </Button>
                )}
                <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>재생 속도: 1.0x</span>
                  <span>•</span>
                  <span>스페이스바: 재생/일시정지</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whisper Dialog */}
      <Dialog open={showWhisperDialog} onOpenChange={setShowWhisperDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <VisuallyHidden.Root>
                            <DialogTitle>AI 자막 · 텍스트 생성</DialogTitle>
          </VisuallyHidden.Root>
          <WhisperProcessor
            recordingId={recording.id}
            audioUrl={recording.audio_url}
            onBack={() => {
              setShowWhisperDialog(false)
              // 변환 완료 후 recording 데이터 새로고침이 필요하면 여기서 처리
              router.refresh() // 페이지 데이터 새로고침
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}