"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomeDashboard from "@/app/components/home-dashboard"
import { auth } from "@/lib/supabase"
import { subjects as subjectsDb, recordings as recordingsDb } from "@/lib/database"
import type { Subject as DbSubject, Recording as DbRecording } from "@/lib/supabase"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [subjects, setSubjects] = useState<DbSubject[]>([])
  const [recordings, setRecordings] = useState<DbRecording[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      
      // Load subjects and recordings
      const subs = await subjectsDb.list(user.id)
      setSubjects(subs)
      
      const recs = await recordingsDb.listAll(user.id)
      setRecordings(recs)
      
      setIsLoading(false)
    }
    
    checkAuth()
  }, [router])

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

  const recentActivities = recordings
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(rec => ({
      id: rec.id,
      type: 'recording' as const,
      subjectName: subjects.find(s => s.id === rec.subject_id)?.name || '알 수 없음',
      title: rec.title,
      date: new Date(rec.created_at).toLocaleDateString('ko-KR'),
      duration: rec.duration ? `${Math.floor(rec.duration / 60)}분` : '처리중'
    }))

  const weeklyProgress = [
    { day: '월', hours: 2 },
    { day: '화', hours: 3 },
    { day: '수', hours: 1 },
    { day: '목', hours: 4 },
    { day: '금', hours: 2 },
    { day: '토', hours: 5 },
    { day: '일', hours: 3 },
  ]

  const totalSeconds = recordings.reduce((acc, rec) => acc + (rec.duration || 0), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return (
    <HomeDashboard
      userName={user?.email?.split('@')[0] || "사용자"}
      totalSubjects={subjects.length}
      totalRecordings={recordings.length}
      totalStudyTime={`${hours}시간 ${minutes}분`}
      recentActivities={recentActivities}
      weeklyProgress={weeklyProgress}
      onStartRecording={() => {
        if (subjects.length === 0) {
          alert('먼저 과목을 추가해주세요.')
          router.push('/subjects')
          return
        }
        // 첫 번째 과목으로 이동
        router.push(`/subjects/${subjects[0].id}/record`)
      }}
      onViewRecentNote={() => {
        if (recordings.length > 0) {
          const subject = subjects.find(s => s.id === recordings[0].subject_id)
          if (subject) {
            router.push(`/subjects/${subject.id}/recordings/${recordings[0].id}`)
          }
        }
      }}
      onViewAIAnalysis={() => {
        // TODO: AI 분석 페이지 구현
        alert('AI 분석 기능은 준비 중입니다.')
      }}
    />
  )
}