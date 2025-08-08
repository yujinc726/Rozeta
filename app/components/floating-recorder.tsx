'use client'

import { useEffect, useState } from 'react'
import { useRecording } from '@/app/contexts/recording-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Play, Pause, Square, Clock, Mic, ChevronUp, ChevronDown, X, FileText } from 'lucide-react'
import { useSidebarContext } from '@/app/contexts/sidebar-context'
import { usePathname } from 'next/navigation'

export default function FloatingRecorder() {
  const recording = useRecording()
  const { isSidebarCollapsed } = useSidebarContext()
  const pathname = usePathname()
  const [isMinimized, setIsMinimized] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Don't show if not recording or on recording page
  const isOnRecordPage = pathname.includes('/record')
  if (!recording.isRecording || isClosing || isOnRecordPage) {
    return null
  }

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const ms = milliseconds % 1000
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  const handleStop = async () => {
    setIsClosing(true)
    await recording.stopRecording()
  }

  const handleCancel = () => {
    if (confirm('녹음을 취소하시겠습니까? 지금까지 녹음한 내용이 모두 삭제됩니다.')) {
      setIsClosing(true)
      recording.cancelRecording()
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300"
      )}
    >
      <Card className={cn(
        "bg-white dark:bg-gray-800 shadow-2xl border-purple-200 dark:border-purple-700",
        "transition-all duration-300",
        isMinimized ? "w-auto" : "w-full max-w-2xl"
      )}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  recording.isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                )}></div>
                {!recording.isPaused && (
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {recording.recordingTitle || '녹음 중'}
              </h3>
              {recording.isPaused && (
                <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  일시정지
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsMinimized(!isMinimized)}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                onClick={handleCancel}
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Timer Display */}
              <div className="text-center mb-4">
                <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatTime(recording.recordingTime)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {recording.subjectName}
                  {recording.selectedPdfIndex >= 0 && recording.pdfFiles[recording.selectedPdfIndex] && (
                    <>
                      {' • '}
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {recording.pdfFiles[recording.selectedPdfIndex].name}
                      </span>
                    </>
                  )}
                  {' • 슬라이드 '}{recording.currentSlideNumber}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => recording.navigateToRecordPage()}
                  variant="outline"
                  className="flex-1"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  녹음 페이지로 이동
                </Button>
                
                <Button
                  onClick={() => recording.isPaused ? recording.resumeRecording() : recording.pauseRecording()}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                >
                  {recording.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={() => recording.markCurrentSlide()}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  시간 기록
                </Button>
                
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size="icon"
                  className="h-10 w-10"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {isMinimized && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    recording.isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                  )}></div>
                  {!recording.isPaused && (
                    <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  )}
                </div>
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(recording.recordingTime)}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => recording.isPaused ? recording.resumeRecording() : recording.pauseRecording()}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  {recording.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </Button>
                
                <Button
                  onClick={handleStop}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:text-red-600"
                >
                  <Square className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
