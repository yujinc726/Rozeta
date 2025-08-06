"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Clock, 
  Calendar,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle,
  HardDrive
} from 'lucide-react'
import { Recording, Subject } from '@/lib/supabase'

interface RecentRecordingsProps {
  recordings: Recording[]
  subjects: Subject[]
  onPlayRecording?: (recording: Recording) => void
  onViewAll?: () => void
}

export default function RecentRecordings({
  recordings,
  subjects,
  onPlayRecording,
  onViewAll
}: RecentRecordingsProps) {
  console.log('RecentRecordings - recordings:', recordings.length, recordings)
  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || '알 수 없음'
  }

  const getAIStatus = (recording: Recording) => {
    if (recording.ai_analyzed_at) {
      return { icon: CheckCircle, text: 'AI 완료', color: 'text-green-600 bg-green-50' }
    }
    if (recording.subtitles) {
      return { icon: Sparkles, text: 'AI 대기', color: 'text-purple-600 bg-purple-50' }
    }
    if (recording.transcript) {
      return { icon: Loader2, text: '처리 중', color: 'text-blue-600 bg-blue-50' }
    }
    return { icon: Clock, text: '미처리', color: 'text-gray-600 bg-gray-50' }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '처리 중'
    const minutes = Math.floor(seconds / 60)
    return `${minutes}분`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const hours = date.getHours()
      const minutes = date.getMinutes()
      return `오늘 ${hours}:${minutes.toString().padStart(2, '0')}`
    } else if (diffDays === 1) {
      return '어제'
    } else if (diffDays < 7) {
      return `${diffDays}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  // 파일 크기 계산 (MB 단위)
  const getFileSize = (recording: Recording) => {
    const bytes = recording.file_size_bytes || 0
    if (bytes === 0) return '계산 중'
    const mb = (bytes / (1024 * 1024)).toFixed(1)
    return `${mb}MB`
  }

  if (recordings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">최근 강의</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-3">
            <FileText className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-gray-500">아직 녹음된 강의가 없습니다</p>
            <p className="text-sm text-gray-400">새로운 강의를 녹음하여 시작하세요</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">최근 강의</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {recordings.slice(0, 6).map((recording) => {
          const aiStatus = getAIStatus(recording)
          const IconComponent = aiStatus.icon
          
          return (
            <div
              key={recording.id}
              className="group p-4 rounded-lg border hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
              onClick={() => onPlayRecording?.(recording)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium group-hover:text-purple-600 transition-colors">
                        {recording.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {getSubjectName(recording.subject_id)}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`${aiStatus.color} border-0`}
                    >
                      <IconComponent className={`h-3 w-3 mr-1 ${
                        aiStatus.text === '처리 중' ? 'animate-spin' : ''
                      }`} />
                      {aiStatus.text}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(recording.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(recording.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {getFileSize(recording)}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayRecording?.(recording)
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}