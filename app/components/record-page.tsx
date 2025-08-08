'use client'

import { useState, useRef, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Play, Pause, RotateCcw, Upload, FileText, Mic, CheckCircle2, ChevronLeft, ChevronRight, Clock, Edit, X, Square, ArrowLeft, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { recordings as recordingsDb, recordEntries, storage } from '@/lib/database'
import { toast } from 'sonner'
import { getPdfPageCount, getPdfPageThumbnail } from '@/lib/pdf-utils'
import { processRecordingWithProgress } from '@/lib/ai-processor'
import { useSidebarContext } from '@/app/contexts/sidebar-context'
import { useRecording } from '@/app/contexts/recording-context'

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
}

export default function RecordPage({ subjectName, subjectId }: RecordPageProps) {
  const { isSidebarCollapsed } = useSidebarContext()
  const recording = useRecording()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])
  
  // Initialize recording context values if not already recording
  useEffect(() => {
    if (!recording.isRecording) {
      recording.updateRecordingTitle(`${subjectName} ${new Date().toLocaleDateString('ko-KR')}`)
    }
  }, [subjectName])
  
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [uploadingPdfIndex, setUploadingPdfIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentSlideThumbnail, setCurrentSlideThumbnail] = useState<string | null>(null)




  // Update current slide thumbnail when PDF or slide changes
  useEffect(() => {
    // 썸네일 업데이트를 지연시켜 모든 상태 변경이 완료된 후 실행
    const timeoutId = setTimeout(() => {
      if (recording.selectedPdfIndex >= 0 && recording.allSlideThumbnails[recording.selectedPdfIndex] && recording.currentSlideNumber > 0) {
        setCurrentSlideThumbnail(recording.allSlideThumbnails[recording.selectedPdfIndex][recording.currentSlideNumber - 1])
      } else {
        setCurrentSlideThumbnail(null)
      }
    }, 0)
    
    return () => clearTimeout(timeoutId)
  }, [recording.selectedPdfIndex, recording.currentSlideNumber, recording.allSlideThumbnails])

  // 현재 슬라이드 번호가 변경될 때마다 해당 PDF의 마지막 페이지 업데이트
  useEffect(() => {
    if (recording.selectedPdfIndex >= 0 && recording.currentSlideNumber > 0) {
      const newPages = [...recording.pdfLastPages]
        // 배열 크기를 현재 PDF 인덱스까지 확장
      while (newPages.length <= recording.selectedPdfIndex) {
          newPages.push(1)
        }
      newPages[recording.selectedPdfIndex] = recording.currentSlideNumber
      recording.setPdfLastPages(newPages)
    }
  }, [recording.selectedPdfIndex, recording.currentSlideNumber])

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
      const newIndex = recording.pdfFiles.length
      recording.setPdfFiles([...recording.pdfFiles, file])
      recording.setSelectedPdfIndex(newIndex)
      setUploadingPdfIndex(newIndex) // 업로드 시작
      
      try {
        toast.info('PDF 파일을 분석하는 중...')
        const pageCount = await getPdfPageCount(file)
        recording.setTotalSlides(pageCount)
        // 새로 업로드된 PDF는 1페이지로 시작
        recording.setCurrentSlideNumber(1)

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
        recording.setAllSlideThumbnails([...recording.allSlideThumbnails, thumbnails])
        // 새 PDF의 초기 페이지를 1로 설정
        recording.setPdfLastPages([...recording.pdfLastPages, 1])
        toast.success(`${pageCount}개의 슬라이드를 감지했습니다.`)
        setUploadingPdfIndex(null) // 업로드 완료
      } catch (error) {
        console.error('PDF 페이지 수 계산 실패:', error)
        toast.error('PDF 파일을 읽을 수 없습니다.')
        recording.setPdfFiles(recording.pdfFiles.slice(0, -1))
        recording.setTotalSlides(0)
        setUploadingPdfIndex(null) // 업로드 실패
      }
    } else if (file) {
      toast.error('PDF 파일만 업로드 가능합니다.')
    }
  }

  const startRecording = async () => {
    await recording.startRecording(subjectId, subjectName, recording.recordingTitle)
  }





  const stopRecording = async () => {
        setIsSaving(true)
    try {
      await recording.stopRecording()
        } finally {
          setIsSaving(false)
    }
  }



  const goToPrevSlide = () => {
    if (recording.currentSlideNumber > 1) {
      recording.setCurrentSlideNumber(recording.currentSlideNumber - 1)
    }
  }

  const goToNextSlide = () => {
    if (recording.currentSlideNumber < recording.totalSlides) {
      recording.setCurrentSlideNumber(recording.currentSlideNumber + 1)
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
                    value={recording.recordingTitle}
                    onChange={(e) => recording.updateRecordingTitle(e.target.value)}
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
                    {recording.recordingTitle}
                  </h1>
                )}
              </div>
              {recording.isRecording && (
                <div className="flex items-center gap-2">
                  {recording.isPaused ? (
                    <>
                      <div className="relative">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-yellow-600">일시정지</span>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-sm font-medium text-red-600">녹음 중</span>
                    </>
                  )}
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
                          startTransition(() => {
                            recording.setSelectedPdfIndex(-1)
                            recording.setTotalSlides(0)
                            // 슬라이드 번호는 유지
                          })
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all",
                          recording.selectedPdfIndex === -1 
                            ? "bg-purple-100 text-purple-700 border border-purple-300" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                        )}
                      >
                        <X className="w-3 h-3" />
                        <span>미선택</span>
                        {recording.selectedPdfIndex === -1 && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                      </button>
                      
                      {recording.pdfFiles.map((file, index) => (
                        <button
                          key={index}
                          onClick={async () => {
                            if (uploadingPdfIndex === index) return; // 업로드 중일 때 클릭 방지
                            
                            try {
                              const pageCount = await getPdfPageCount(file)
                              // 해당 PDF의 마지막 페이지 계산 (없으면 1페이지)
                              const lastPage = recording.pdfLastPages[index] || 1
                              const targetSlideNumber = Math.min(lastPage, pageCount)
                              
                              // 모든 상태를 한번에 업데이트하여 중간 상태 방지
                              startTransition(() => {
                                recording.setSelectedPdfIndex(index)
                                recording.setTotalSlides(pageCount)
                                recording.setCurrentSlideNumber(targetSlideNumber)
                              })
                            } catch (error) {
                              console.error('PDF 페이지 수 계산 실패:', error)
                              startTransition(() => {
                                recording.setSelectedPdfIndex(index)
                                recording.setTotalSlides(0)
                              })
                            }
                          }}
                          disabled={uploadingPdfIndex === index}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all",
                            uploadingPdfIndex === index
                              ? "bg-blue-100 text-blue-700 border border-blue-300 cursor-not-allowed"
                              : recording.selectedPdfIndex === index 
                              ? "bg-purple-100 text-purple-700 border border-purple-300" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                          )}
                        >
                          {uploadingPdfIndex === index ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          {recording.selectedPdfIndex === index && uploadingPdfIndex !== index && (
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
              {recording.selectedPdfIndex >= 0 && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button
                    onClick={goToPrevSlide}
                    disabled={recording.currentSlideNumber <= 1}
                    variant="outline"
                    size="sm"
                    className="bg-white/90 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={goToNextSlide}
                    disabled={recording.currentSlideNumber >= recording.totalSlides}
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
                    alt={`슬라이드 ${recording.currentSlideNumber}`}
                    className="w-full h-full object-contain p-8"
                    style={{ maxHeight: 'calc(100vh - 250px)' }}
                  />
                  {recording.selectedPdfIndex >= 0 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <div className="bg-black/30 hover:bg-black/70 text-white/70 hover:text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all duration-200 cursor-default">
                        <span className="text-sm font-medium">
                          {recording.currentSlideNumber} / {recording.totalSlides}
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
            {recording.slideSyncs.length > 0 && (
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
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">강의안</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">슬라이드 번호</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">시작 시간</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">종료 시간</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recording.slideSyncs.map((sync, index) => (
                        <tr key={sync.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <select
                              value={sync.pdfFileName}
                              onChange={(e) => {
                                const updated = [...recording.slideSyncs]
                                updated[index] = { ...updated[index], pdfFileName: e.target.value }
                                recording.updateSlideSyncs(updated)
                              }}
                              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            >
                              <option value="">미선택</option>
                              {recording.pdfFiles.map((file, fileIndex) => (
                                <option key={fileIndex} value={file.name}>
                                  {file.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {sync.slideNumber === 0 ? (
                              <span className="text-gray-500 text-sm italic">미선택</span>
                            ) : (
                              <input
                                type="number"
                                value={sync.slideNumber || ''}
                                onChange={(e) => {
                                  const updated = [...recording.slideSyncs]
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                                  updated[index] = { ...updated[index], slideNumber: value }
                                  recording.updateSlideSyncs(updated)
                                }}
                                className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                min="1"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sync.startTime}
                              onChange={(e) => {
                                const updated = [...recording.slideSyncs]
                                updated[index] = { ...updated[index], startTime: e.target.value }
                                recording.updateSlideSyncs(updated)
                              }}
                              className="w-32 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sync.endTime || ''}
                              onChange={(e) => {
                                const updated = [...recording.slideSyncs]
                                updated[index] = { ...updated[index], endTime: e.target.value }
                                recording.updateSlideSyncs(updated)
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
                                const updated = [...recording.slideSyncs]
                                updated[index] = { ...updated[index], memo: e.target.value }
                                recording.updateSlideSyncs(updated)
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
                    슬라이드 {recording.currentSlideNumber} 메모
                  </Label>
                </div>
                <Textarea
                  id="slide-memo"
                  value={recording.slideMemo}
                  onChange={(e) => recording.updateSlideMemo(e.target.value)}
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
                      {formatTime(recording.recordingTime).display}
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="space-y-2">
                    {!recording.isRecording ? (
                      <>
                        <Button
                          onClick={startRecording}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          녹음 시작
                        </Button>

                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => recording.isPaused ? recording.resumeRecording() : recording.pauseRecording()}
                            variant="outline"
                            className="w-full"
                          >
                            {recording.isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                            {recording.isPaused ? '재개' : '일시정지'}
                          </Button>
                          <Button
                            onClick={() => recording.markCurrentSlide()}
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
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-6"></div>
              
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">녹음을 저장하는 중...</h3>
                  <p className="text-gray-600 text-center">잠시만 기다려주세요</p>
            </div>
          </div>
        </div>
      )}


    </>
  )
} 