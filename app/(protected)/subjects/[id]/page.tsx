"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  Mic, 
  FileAudio, 
  MoreHorizontal, 
  Edit2, 
  Trash2,
  Clock,
  Calendar,
  HardDrive,
  Sparkles,
  Loader2,
  CheckCircle,
  FileText
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { subjects as subjectsDb, recordings as recordingsDb } from "@/lib/database"
import type { Subject as DbSubject, Recording as DbRecording } from "@/lib/supabase"
import { auth } from "@/lib/supabase"
import { toast } from "sonner"
import { useRecording } from "@/app/contexts/recording-context"
import { useWhisper } from "@/app/contexts/whisper-context"
import { useAIAnalysis } from "@/app/contexts/ai-analysis-context"

interface SubjectPageProps {
  params: Promise<{
    id: string
  }>
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const router = useRouter()
  const recording = useRecording()
  const { getTaskStatus: getWhisperStatus } = useWhisper()
  const { getTaskStatus: getAIStatus } = useAIAnalysis()
  const [subject, setSubject] = useState<DbSubject | null>(null)
  const [recordings, setRecordings] = useState<DbRecording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subjectId, setSubjectId] = useState<string>("") 
  const [editingRecording, setEditingRecording] = useState<DbRecording | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [showRecordingWarning, setShowRecordingWarning] = useState(false)

  useEffect(() => {
    const loadSubjectData = async () => {
      try {
        const { data: { user } } = await auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        const { id } = await params
        setSubjectId(id)

        // Load subject
        const subjects = await subjectsDb.list(user.id)
        const currentSubject = subjects.find(s => s.id === id)
        
        if (!currentSubject) {
          toast.error('과목을 찾을 수 없습니다.')
          router.push('/dashboard')
          return
        }
        
        setSubject(currentSubject)
        
        // Load recordings
        const recs = await recordingsDb.list(id)
        setRecordings(recs)
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading subject data:', error)
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
        setIsLoading(false)
      }
    }
    
    loadSubjectData()
  }, [params, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!subject) {
    return null
  }

  const handleRenameRecording = async () => {
    if (!editingRecording || !newTitle.trim()) return
    
    try {
      setIsRenaming(true)
      await recordingsDb.update(editingRecording.id, { title: newTitle.trim() })
      
      // Update local state
      setRecordings(prev => 
        prev.map(r => r.id === editingRecording.id ? { ...r, title: newTitle.trim() } : r)
      )
      
      toast.success('기록 이름이 변경되었습니다.')
      setEditingRecording(null)
      setNewTitle('')
      setIsRenameDialogOpen(false)
    } catch (error) {
      console.error('Error renaming recording:', error)
      toast.error('이름 변경 중 오류가 발생했습니다.')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDeleteRecording = async (recording: DbRecording) => {
    try {
      setIsDeleting(true)
      await recordingsDb.delete(recording.id)
      
      // Update local state
      setRecordings(prev => prev.filter(r => r.id !== recording.id))
      
      toast.success('기록이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting recording:', error)
      toast.error('기록 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  // AI 상태 확인 함수 (홈 화면과 동일)
  const getRecordingStatus = (recording: DbRecording) => {
    // 백그라운드 작업 상태 확인
    const whisperTask = getWhisperStatus(recording.id)
    const aiTask = getAIStatus(recording.id)
    
    // AI 분석 상태
    if (aiTask?.status === 'analyzing') {
      return { 
        icon: Loader2, 
        text: aiTask.isRegenerate ? 'AI 재분석중' : 'AI 분석중', 
        color: aiTask.isRegenerate ? 'text-green-600 bg-green-50' : 'text-purple-600 bg-purple-50'
      }
    }
    if (recording.ai_analyzed_at) {
      return { icon: CheckCircle, text: 'AI 완료', color: 'text-green-600 bg-green-50' }
    }
    
    // 텍스트 변환 상태
    if (whisperTask?.status === 'processing') {
      return { 
        icon: Loader2, 
        text: whisperTask.isRegenerate ? '텍스트 재생성중' : '텍스트 생성중', 
        color: whisperTask.isRegenerate ? 'text-green-600 bg-green-50' : 'text-purple-600 bg-purple-50'
      }
    }
    if (recording.subtitles) {
      return { icon: Sparkles, text: 'AI 준비', color: 'text-purple-600 bg-purple-50' }
    }
    if (recording.transcript) {
      return { icon: FileText, text: '자막 대기', color: 'text-orange-600 bg-orange-50' }
    }
    
    return { icon: Clock, text: '미처리', color: 'text-gray-600 bg-gray-50' }
  }

  // 파일 크기 계산 함수 - 오디오와 PDF 구분
  const getAudioSize = (recording: DbRecording) => {
    const bytes = recording.file_size_bytes || 0
    if (bytes === 0) return '계산 중'
    const mb = (bytes / (1024 * 1024)).toFixed(1)
    return `${mb}MB`
  }

  const getPdfSize = (recording: DbRecording) => {
    const bytes = recording.pdf_size_bytes || 0
    if (bytes === 0) return '없음'
    const mb = (bytes / (1024 * 1024)).toFixed(1)
    return `${mb}MB`
  }

  const handleStopAndStartNew = async () => {
    setShowRecordingWarning(false)
    await recording.stopRecording()
    // 잠시 대기 후 녹음 페이지로 이동
    setTimeout(() => {
      router.push(`/subjects/${subjectId}/record`)
    }, 500)
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 border-b border-slate-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-slate-900 dark:text-gray-100">{subject.name}</h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
                전체 기록 {recordings.length}개
              </p>
            </div>

            <Button 
              onClick={() => {
                if (recording.isRecording) {
                  setShowRecordingWarning(true)
                } else {
                  router.push(`/subjects/${subjectId}/record`)
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Mic className="w-4 h-4 mr-2" />
              새 기록 시작
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* All Records Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-purple-600" />
              기록 목록
            </CardTitle>
            <CardDescription>수업 중 작성한 모든 기록들을 확인하고 관리하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                아직 녹음된 파일이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((recording) => {
                  const recordingStatus = getRecordingStatus(recording)
                  const IconComponent = recordingStatus.icon
                  
                  return (
                    <div
                      key={recording.id}
                      className="group p-4 rounded-lg border hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                      onClick={() => router.push(`/subjects/${subjectId}/recordings/${recording.id}`)}
                    >
                                              <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium group-hover:text-purple-600 transition-colors">
                            {recording.title}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(recording.created_at).toLocaleString('ko-KR', {
                                year: 'numeric',
                                weekday: 'short',
                                month: 'numeric', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recording.duration ? `${Math.floor(recording.duration / 60)}분` : '처리중'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mic className="h-3 w-3" />
                              {getAudioSize(recording)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {getPdfSize(recording)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary"
                            className={`${recordingStatus.color} border-0`}
                          >
                            <IconComponent className={`h-3 w-3 mr-1 ${
                              ['텍스트 생성중', 'AI 분석중'].includes(recordingStatus.text) ? 'animate-spin' : ''
                            }`} />
                            {recordingStatus.text}
                          </Badge>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="hover:bg-gray-200"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => {
                                        e.preventDefault()
                                        setEditingRecording(recording)
                                        setNewTitle(recording.title)
                                        setIsRenameDialogOpen(true)
                                      }}
                                    >
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      이름 변경
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>기록 이름 변경</DialogTitle>
                                      <DialogDescription>
                                        새로운 이름을 입력하세요.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <Input
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="새 이름을 입력하세요"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleRenameRecording()
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          setEditingRecording(null)
                                          setNewTitle('')
                                          setIsRenameDialogOpen(false)
                                        }}
                                      >
                                        취소
                                      </Button>
                                      <Button 
                                        onClick={handleRenameRecording}
                                        disabled={isRenaming || !newTitle.trim()}
                                      >
                                        {isRenaming ? '변경 중...' : '변경'}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      기록 삭제
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>기록 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        '{recording.title}' 기록을 삭제하시겠습니까?
                                        이 작업은 되돌릴 수 없습니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteRecording(recording)}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={isDeleting}
                                      >
                                        {isDeleting ? '삭제 중...' : '삭제'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recording Warning Dialog */}
      <AlertDialog open={showRecordingWarning} onOpenChange={setShowRecordingWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              녹음이 진행 중입니다
            </AlertDialogTitle>
            <AlertDialogDescription>
              현재 다른 녹음이 진행 중입니다. 새로운 녹음을 시작하려면 현재 녹음을 먼저 중단해야 합니다.
              <br />
              <br />
              현재 녹음을 중단하고 새로운 녹음을 시작하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStopAndStartNew}
              className="bg-red-600 hover:bg-red-700"
            >
              현재 녹음 중단하고 새로 시작
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}