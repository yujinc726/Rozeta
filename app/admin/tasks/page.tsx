"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RefreshCw, Brain, FileAudio, Clock, CheckCircle, AlertCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

type TaskStats = {
  pendingWhisper: number
  pendingAI: number
  recentCompleted: number
  totalProcessed: number
}

type TaskRecord = {
  id: string
  title: string
  user_id: string
  transcript: string | null
  subtitles: string | null
  ai_lecture_overview: string | null
  ai_analyzed_at: string | null
  created_at: string
  updated_at: string
  user: {
    full_name: string | null
    email: string
  }
}

type TaskData = {
  stats: TaskStats
  activeWhisperTasks: TaskRecord[]
  activeAITasks: TaskRecord[]
  recentCompleted: TaskRecord[]
}

export default function AdminTasksPage() {
  const [data, setData] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryLoading, setRetryLoading] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // 30초마다 자동 새로고침
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/tasks')
      const result = await res.json()
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (recordingId: string, taskType: 'whisper' | 'ai') => {
    setRetryLoading(`${recordingId}-${taskType}`)
    try {
      const res = await fetch('/api/admin/tasks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId, taskType })
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message)
        loadData()
      } else {
        toast.error(result.error)
      }
    } catch (e) {
      toast.error('재시도 요청 실패')
    } finally {
      setRetryLoading(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getTaskAge = (dateStr: string) => {
    const now = Date.now()
    const created = new Date(dateStr).getTime()
    const diffMinutes = Math.floor((now - created) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes}분 전`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`
    return `${Math.floor(diffMinutes / 1440)}일 전`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">작업 상태를 불러오는 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-red-500">작업 데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">백그라운드 작업 모니터링</h1>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Whisper 대기</CardTitle>
            <FileAudio className="w-4 h-4 ml-auto text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.pendingWhisper ?? 0}</div>
            <p className="text-xs text-gray-500">음성→텍스트 변환 대기</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 분석 대기</CardTitle>
            <Brain className="w-4 h-4 ml-auto text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.pendingAI ?? 0}</div>
            <p className="text-xs text-gray-500">강의 내용 분석 대기</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최근 완료</CardTitle>
            <CheckCircle className="w-4 h-4 ml-auto text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.recentCompleted ?? 0}</div>
            <p className="text-xs text-gray-500">최근 완료된 작업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 처리됨</CardTitle>
            <Clock className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.totalProcessed ?? 0}</div>
            <p className="text-xs text-gray-500">전체 처리 완료</p>
          </CardContent>
        </Card>
      </div>

      {/* Whisper 대기 작업 */}
      {(data?.activeWhisperTasks?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <FileAudio className="w-4 h-4 mr-2 text-purple-500" />
              Whisper 변환 대기 중 ({data?.activeWhisperTasks?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.activeWhisperTasks ?? []).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      {task.user.full_name || task.user.email} • {getTaskAge(task.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                      대기중
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRetry(task.id, 'whisper')}
                      disabled={retryLoading === `${task.id}-whisper`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 분석 대기 작업 */}
      {(data?.activeAITasks?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Brain className="w-4 h-4 mr-2 text-blue-500" />
              AI 분석 대기 중 ({data?.activeAITasks?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.activeAITasks ?? []).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      {task.user.full_name || task.user.email} • {getTaskAge(task.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      대기중
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRetry(task.id, 'ai')}
                      disabled={retryLoading === `${task.id}-ai`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 완료된 작업 */}
      {(data?.recentCompleted?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              최근 완료된 작업 ({data?.recentCompleted?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recentCompleted ?? []).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      {task.user.full_name || task.user.email} • 
                      {task.ai_analyzed_at && ` 완료: ${formatDate(task.ai_analyzed_at)}`}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    완료
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 모든 작업이 완료된 경우 */}
      {(data?.activeWhisperTasks?.length ?? 0) === 0 && (data?.activeAITasks?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <div className="text-lg font-medium mb-2">모든 작업이 완료되었습니다</div>
            <div className="text-sm text-gray-500">현재 대기 중인 백그라운드 작업이 없습니다.</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


