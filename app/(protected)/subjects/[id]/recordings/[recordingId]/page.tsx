"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RecordDetail from "@/app/components/record-detail"
import WhisperProcessor from "@/app/components/whisper-processor"
import { recordings as recordingsDb } from "@/lib/database"
import type { Recording as DbRecording } from "@/lib/supabase"
import { auth } from "@/lib/supabase"
import { toast } from "sonner"

interface RecordingDetailPageProps {
  params: Promise<{
    id: string
    recordingId: string
  }>
}

export default function RecordingDetailPage({ params }: RecordingDetailPageProps) {
  const router = useRouter()
  const [recording, setRecording] = useState<DbRecording | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWhisper, setShowWhisper] = useState(false)
  const [subjectId, setSubjectId] = useState<string>("")

  useEffect(() => {
    const loadRecording = async () => {
      try {
        const { data: { user } } = await auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        const { id, recordingId } = await params
        setSubjectId(id)

        // Load recording
        const rec = await recordingsDb.get(recordingId)
        
        if (!rec || rec.subject_id !== id) {
          toast.error('녹음을 찾을 수 없습니다.')
          router.push(`/subjects/${id}`)
          return
        }
        
        setRecording(rec)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading recording:', error)
        toast.error('녹음을 불러오는 중 오류가 발생했습니다.')
        setIsLoading(false)
      }
    }
    
    loadRecording()
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

  if (!recording) {
    return null
  }

  if (showWhisper) {
    return (
      <WhisperProcessor
        recordingId={recording.id}
        onBack={() => setShowWhisper(false)}
      />
    )
  }

  return (
    <RecordDetail
      recording={recording}
      onOpenWhisper={() => setShowWhisper(true)}
      onOpenAIExplanation={() => {
        // TODO: AI 설명 화면으로 이동
        toast.info('AI 설명 기능은 준비 중입니다.')
      }}
    />
  )
}