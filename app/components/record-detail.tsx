"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Save, X, Play, Pause, Wand2, FileAudio, Brain, AlertCircle, FileText, Clock, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { toast } from "sonner"
import { recordEntries } from "@/lib/database"
import type { Recording as DbRecording, RecordEntry } from "@/lib/supabase"
import WhisperProcessor from "./whisper-processor"

interface RecordDetailProps {
  recording: DbRecording
  onOpenWhisper?: () => void
  onOpenAIExplanation?: () => void
  isSidebarCollapsed?: boolean
}

export default function RecordDetail({ recording, onOpenWhisper, onOpenAIExplanation, isSidebarCollapsed = false }: RecordDetailProps) {
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
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number | null>(null)

  // 슬라이드 기록 불러오기
  useEffect(() => {
    loadRecordEntries()
  }, [recording.id])

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
  }, [currentTime, recordEntriesList])

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
    } catch (error) {
      console.error('Failed to load record entries:', error)
      toast.error('슬라이드 기록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
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
        if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }
      } else {
        audioRef.current.play()
        animationRef.current = requestAnimationFrame(updateProgress)
      }
      setIsPlaying(!isPlaying)
    }
  }

  // 재생 진행 상황 업데이트
  const updateProgress = () => {
    if (audioRef.current) {
      const currentAudioTime = audioRef.current.currentTime
      if (isFinite(currentAudioTime)) {
        setCurrentTime(currentAudioTime)
      }
      if (!audioRef.current.paused) {
        animationRef.current = requestAnimationFrame(updateProgress)
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
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }
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
      const milliseconds = parseInt(secondsParts[1] || '0') || 0
      
      const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
      
      // 값 검증
      if (!isFinite(totalSeconds) || totalSeconds < 0) return
      if (duration > 0 && totalSeconds > duration) return
      
      audioRef.current.currentTime = totalSeconds
      setCurrentTime(totalSeconds)
      
      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
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
  const hasSummary = recording.summary !== null && recording.summary !== undefined

  // PDF URLs 파싱
  const pdfUrls = recording.pdf_url ? recording.pdf_url.split(',') : []

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => router.push(`/subjects/${recording.subject_id}`)} 
                variant="ghost" 
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로가기
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{recording.title}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(recording.created_at).toLocaleDateString('ko-KR')} · 
                  {recording.duration ? formatDuration(recording.duration) : '시간 정보 없음'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI 처리 상태 카드 */}
      <div className="p-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* 음성 텍스트 변환 카드 */}
          <Card className={hasTranscript ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${hasTranscript ? "bg-green-100" : "bg-orange-100"}`}>
                    <FileAudio className={`w-6 h-6 ${hasTranscript ? "text-green-600" : "text-orange-600"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI 텍스트 변환</CardTitle>
                    <CardDescription>
                      {hasTranscript ? "변환 완료" : "아직 변환되지 않음"}
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
              {hasTranscript ? (
                <p className="text-sm text-gray-700">
                  음성이 텍스트로 변환되었습니다. AI 설명을 확인할 수 있습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      음성을 텍스트로 변환하면 AI가 강의 내용을 분석하고 요약해드립니다.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowWhisperDialog(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI 텍스트 변환
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI 설명 카드 */}
          <Card className={hasSummary ? "border-purple-200 bg-purple-50" : "border-gray-200"}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${hasSummary ? "bg-purple-100" : "bg-gray-100"}`}>
                    <Brain className={`w-6 h-6 ${hasSummary ? "text-purple-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI 강의 설명</CardTitle>
                    <CardDescription>
                      {hasSummary ? "분석 완료" : hasTranscript ? "분석 가능" : "텍스트 변환 필요"}
                    </CardDescription>
                  </div>
                </div>
                {hasSummary ? (
                  <Badge className="bg-purple-600">완료</Badge>
                ) : hasTranscript ? (
                  <Badge variant="secondary">준비됨</Badge>
                ) : (
                  <Badge variant="outline">대기</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hasSummary ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    AI가 강의 내용을 분석했습니다. 슬라이드별 설명을 확인하세요.
                  </p>
                  <Button 
                    onClick={onOpenAIExplanation}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    AI 설명 보기
                  </Button>
                </div>
              ) : hasTranscript ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    텍스트 변환이 완료되어 AI 분석을 시작할 수 있습니다.
                  </p>
                  <Button 
                    onClick={onOpenAIExplanation}
                    variant="outline"
                    className="w-full"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    AI 분석 시작하기
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  먼저 음성을 텍스트로 변환해주세요.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 녹음 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">



        </div>

        {/* 현재 슬라이드 표시 */}
        {currentEntry && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                현재 슬라이드
              </CardTitle>
              <CardDescription>
                <div className="flex items-center justify-between">
                  <span>{currentEntry.material_name} - 슬라이드 {currentEntry.slide_number}</span>
                  <span className="text-xs text-gray-400">← → 키로 이동 가능</span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 슬라이드 이미지 */}
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
                  {slideLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">슬라이드 로딩 중...</p>
                      </div>
                    </div>
                  ) : currentSlideImage ? (
                    <>
                      <img
                        src={currentSlideImage}
                        alt={`슬라이드 ${currentEntry.slide_number}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Image load error')
                          e.currentTarget.src = `https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Slide+${currentEntry.slide_number}`
                        }}
                      />
                      
                      {/* 슬라이드 네비게이션 버튼 */}
                      <div className="absolute inset-y-0 left-0 flex items-center">
                        <Button
                          onClick={goToPreviousSlide}
                          disabled={getCurrentEntryIndex() <= 0}
                          size="icon"
                          variant="ghost"
                          className="ml-2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                      </div>
                      
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <Button
                          onClick={goToNextSlide}
                          disabled={getCurrentEntryIndex() >= recordEntriesList.length - 1}
                          size="icon"
                          variant="ghost"
                          className="mr-2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                      </div>
                      
                      {/* 슬라이드 번호 표시 */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 text-white px-3 py-1 rounded-full backdrop-blur-sm">
                          <span className="text-sm font-medium">
                            {getCurrentEntryIndex() + 1} / {recordEntriesList.length}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-gray-500">슬라이드를 불러올 수 없습니다</p>
                    </div>
                  )}
                </div>
                
                {/* 메모 */}
                {currentEntry.memo && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">메모</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentEntry.memo}</p>
                  </div>
                )}
                
                {/* 시간 정보 */}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>시작: {currentEntry.start_time}</span>
                  {currentEntry.end_time && <span>종료: {currentEntry.end_time}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 슬라이드 기록 테이블 */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                슬라이드 기록
              </CardTitle>
              <Badge variant="outline">{recordEntriesList.length}개</Badge>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">강의안명</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">슬라이드 번호</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">시작 시간</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">종료 시간</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">메모</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordEntriesList.map((entry) => (
                      <tr 
                        key={entry.id} 
                        className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                          currentEntry?.id === entry.id ? 'bg-purple-50 border-purple-200' : ''
                        }`}
                        onClick={() => {
                          if (editingEntry?.id !== entry.id) {
                            // 해당 슬라이드로 이동
                            setCurrentEntry(entry)
                            loadSlideImage(entry)
                            // 시작 시간으로 이동
                            seekToTime(entry.start_time)
                          }
                        }}
                      >
                        {editingEntry?.id === entry.id ? (
                          <>
                            <td className="px-4 py-3">
                              <Input
                                value={editedData?.material_name || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, material_name: e.target.value} : null)}
                                className="w-full"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={editedData?.slide_number || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, slide_number: parseInt(e.target.value)} : null)}
                                className="w-20"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={editedData?.start_time || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, start_time: e.target.value} : null)}
                                className="w-32"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={editedData?.end_time || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, end_time: e.target.value} : null)}
                                className="w-32"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={editedData?.memo || ''}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, memo: e.target.value} : null)}
                                className="w-full"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <Button
                                  onClick={handleSave}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={handleCancel}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm">{entry.material_name}</td>
                            <td className="px-4 py-3 text-sm">{entry.slide_number}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  seekToTime(entry.start_time)
                                }}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {entry.start_time}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  entry.end_time && seekToTime(entry.end_time)
                                }}
                                className="text-sm text-blue-600 hover:underline"
                                disabled={!entry.end_time}
                              >
                                {entry.end_time || '-'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.memo || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(entry)
                                  }}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 플로팅 오디오 플레이어 */}
      {recording.audio_url && (
        <div 
          className={`fixed bottom-0 right-0 bg-white border-t border-gray-200 shadow-lg backdrop-blur-sm z-40 transition-all duration-300 ${
            isSidebarCollapsed ? 'left-16' : 'left-80'
          }`}
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
            onError={(e) => {
              console.error('Audio loading error:', e)
              const audio = e.currentTarget as HTMLAudioElement
              console.error('Error code:', audio.error?.code)
              console.error('Error message:', audio.error?.message)
            }}
            preload="auto"
            className="hidden"
          />
          
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center gap-6">
              {/* 현재 재생 정보 */}
              <div className="flex items-center gap-3 min-w-0 w-72">
                <div className="shrink-0">
                  <FileAudio className="w-5 h-5 text-purple-600" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {recording.title}
                  </p>
                  {currentEntry && (
                    <p className="text-xs text-gray-500 truncate">
                      슬라이드 {currentEntry.slide_number} {currentEntry.memo && `• ${currentEntry.memo}`}
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
                          audioRef.current.currentTime = newTime
                          setCurrentTime(newTime)
                        }
                      }
                    }
                  }}
                >
                  <div
                    className="h-full bg-purple-600 transition-all duration-100 pointer-events-none"
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

              {/* 추가 정보 표시 (선택사항) */}
              <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
                <span>재생 속도: 1.0x</span>
                <span>•</span>
                <span>스페이스바: 재생/일시정지</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whisper Dialog */}
      <Dialog open={showWhisperDialog} onOpenChange={setShowWhisperDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <VisuallyHidden.Root>
            <DialogTitle>AI 텍스트 변환</DialogTitle>
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