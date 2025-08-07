"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RecordPageComponent from "@/app/components/record-page"
import { subjects as subjectsDb } from "@/lib/database"
import { auth } from "@/lib/supabase"
import { toast } from "sonner"

interface RecordPageProps {
  params: Promise<{
    id: string
  }>
}

export default function RecordPage({ params }: RecordPageProps) {
  const router = useRouter()
  const [subjectName, setSubjectName] = useState<string>("")
  const [subjectId, setSubjectId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSubject = async () => {
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
        
        setSubjectName(currentSubject.name)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading subject:', error)
        toast.error('과목 정보를 불러오는 중 오류가 발생했습니다.')
        setIsLoading(false)
      }
    }
    
    loadSubject()
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

  return (
    <RecordPageComponent 
      subjectName={subjectName} 
      subjectId={subjectId}
    />
  )
}