"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, FileAudio, Play } from "lucide-react"
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



  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
            <p className="text-gray-600 mt-1">
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
                          <span>{new Date(recording.created_at).toLocaleDateString('ko-KR')}</span>
                          <span>{recording.audio_url ? '업로드 완료' : '업로드 중'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        {recording.transcript ? '처리 완료' : '미처리'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
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