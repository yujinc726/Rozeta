"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, FileAudio, Brain, User, Calendar, Clock, Layers, RefreshCw, UserX, Trash2 } from "lucide-react"
import { toast } from "sonner"

type RecordingDetail = {
  recording: any
  recordEntriesCount: number
  processingStatus: {
    hasTranscript: boolean
    hasSubtitles: boolean
    hasAIAnalysis: boolean
    transcriptAt: string | null
    aiAnalyzedAt: string | null
  }
}

export default function AdminRecordingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const recordingId = params.id as string
  const [data, setData] = useState<RecordingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [transferUserId, setTransferUserId] = useState('')
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [recordingId])

  const loadData = async () => {
    try {
      const res = await fetch(`/api/admin/recordings/${recordingId}`)
      const result = await res.json()
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleReprocess = async (type: 'whisper' | 'ai') => {
    try {
      const res = await fetch(`/api/admin/recordings/${recordingId}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message)
        loadData()
      } else {
        toast.error(result.error)
      }
    } catch (e) {
      toast.error('재처리 요청 실패')
    }
  }

  const handleTransfer = async () => {
    if (!transferUserId.trim()) {
      toast.error('사용자 ID를 입력하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/recordings/${recordingId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: transferUserId })
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message)
        setShowTransferDialog(false)
        setTransferUserId('')
        loadData()
      } else {
        toast.error(result.error)
      }
    } catch (e) {
      toast.error('이전 요청 실패')
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/recordings/${recordingId}/delete`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success('녹음이 삭제되었습니다')
        router.push('/admin/recordings')
      } else {
        const result = await res.json()
        toast.error(result.error)
      }
    } catch (e) {
      toast.error('삭제 요청 실패')
    }
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const units = ['B','KB','MB','GB','TB']
    let i = 0
    let v = bytes
    while (v >= 1024 && i < units.length-1) { v /= 1024; i++ }
    return `${v.toFixed(1)} ${units[i]}`
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">녹음 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!data || !data.recording) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-red-500">녹음을 찾을 수 없습니다.</div>
      </div>
    )
  }

  const { recording, recordEntriesCount, processingStatus } = data

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>
        <h1 className="text-xl font-semibold">녹음 상세</h1>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
            <FileAudio className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">제목</div>
              <div className="font-medium">{recording.title}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">과목</div>
              <div className="text-sm">{recording.subject?.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">소유자</div>
              <div className="text-sm">
                {recording.user?.full_name || recording.user?.email || '—'}
                <div className="text-xs text-gray-400 font-mono">{recording.user_id}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">생성일</div>
              <div className="text-sm">{new Date(recording.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">길이</div>
              <div className="text-sm">{recording.duration ? formatDuration(recording.duration) : '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">파일 정보</CardTitle>
            <Layers className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">오디오 파일</div>
              <div className="text-sm">
                {recording.audio_url ? (
                  <a href={recording.audio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    링크
                  </a>
                ) : '—'}
              </div>
              <div className="text-xs text-gray-400">
                {recording.file_size_bytes ? formatBytes(recording.file_size_bytes) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">PDF 파일</div>
              <div className="text-sm">
                {recording.pdf_url ? (
                  <a href={recording.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    링크
                  </a>
                ) : '—'}
              </div>
              <div className="text-xs text-gray-400">
                {recording.pdf_size_bytes ? formatBytes(recording.pdf_size_bytes) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">슬라이드 기록</div>
              <div className="text-sm">{recordEntriesCount}개</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 처리 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI 처리 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-sm font-medium">Whisper 자막</div>
                <div className="text-xs text-gray-500">음성 → 텍스트 변환</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={processingStatus.hasTranscript ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {processingStatus.hasTranscript ? '완료' : '대기'}
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleReprocess('whisper')}
                  className="h-6 text-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-sm font-medium">AI 분석</div>
                <div className="text-xs text-gray-500">강의 내용 분석</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={processingStatus.hasAIAnalysis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {processingStatus.hasAIAnalysis ? '완료' : '대기'}
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleReprocess('ai')}
                  className="h-6 text-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-sm font-medium">전체 처리</div>
                <div className="text-xs text-gray-500">자막 + AI 분석</div>
              </div>
              <Badge className={processingStatus.hasTranscript && processingStatus.hasAIAnalysis ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                {processingStatus.hasTranscript && processingStatus.hasAIAnalysis ? '완료' : '진행중'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 관리 액션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">관리 액션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserX className="w-4 h-4 mr-2" />
                  소유자 이전
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>녹음 소유자 이전</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="targetUserId">대상 사용자 ID</Label>
                    <Input
                      id="targetUserId"
                      value={transferUserId}
                      onChange={(e) => setTransferUserId(e.target.value)}
                      placeholder="사용자 UUID 입력"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                      취소
                    </Button>
                    <Button onClick={handleTransfer}>
                      이전
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>녹음 삭제</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    이 녹음과 관련된 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      취소
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      삭제
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
