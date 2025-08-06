"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Mic, FileAudio, MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { subjects as subjectsDb, recordings as recordingsDb } from "@/lib/database"
import type { Subject as DbSubject, Recording as DbRecording } from "@/lib/supabase"
import { auth } from "@/lib/supabase"
import { toast } from "sonner"

interface SubjectPageProps {
  params: Promise<{
    id: string
  }>
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const router = useRouter()
  const [subject, setSubject] = useState<DbSubject | null>(null)
  const [recordings, setRecordings] = useState<DbRecording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subjectId, setSubjectId] = useState<string>("") 
  const [editingRecording, setEditingRecording] = useState<DbRecording | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/60 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-slate-900">{subject.name}</h1>
              <p className="text-sm text-slate-500 mt-2">
                전체 기록 {recordings.length}개
              </p>
            </div>

            <Button 
              onClick={() => router.push(`/subjects/${subjectId}/record`)}
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
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    onClick={() => router.push(`/subjects/${subjectId}/recordings/${recording.id}`)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileAudio className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{recording.title}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{recording.duration ? `${Math.floor(recording.duration / 60)}분` : '처리중'}</span>
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
                      </div>
                    </div>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}