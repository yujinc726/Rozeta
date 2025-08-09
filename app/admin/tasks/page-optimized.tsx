"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Brain, FileAudio, Clock, CheckCircle, RotateCcw } from "lucide-react"
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
  created_at: string
  updated_at: string
  ai_analyzed_at?: string
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

export default function AdminTasksPageOptimized() {
  const [data, setData] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryLoading, setRetryLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃
      
      const res = await fetch('/api/admin/tasks', {
        signal: controller.signal,
        cache: 'no-store' // 캐시 방지
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const result = await res.json()
      setData(result)
    } catch (e: any) {
      console.error('Load data error:', e)
      setError(e.name === 'AbortError' ? '요청 시간 초과' : e.message || '데이터 로드 실패')
      // 에러 시에도 기본 구조 제공
      setData({
        stats: { pendingWhisper: 0, pendingAI: 0, recentCompleted: 0, totalProcessed: 0 },
        activeWhisperTasks: [],
        activeAITasks: [],
        recentCompleted: []
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    // 자동 새로고침 간격을 60초로 늘려서 부하 감소
    const interval = setInterval(() => loadData(false), 60000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleRetry = async (recordingId: string, taskType: 'whisper' | 'ai') => {
    const loadingKey = `${recordingId}-${taskType}`
    setRetryLoading(loadingKey)
    
    try {
      const res = await fetch('/api/admin/tasks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId, taskType })
      })
      const result = await res.json()
      
      if (res.ok) {
        toast.success(result.message)
        loadData(false) // 조용히 새로고침
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
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTaskAge = (dateStr: string) => {
    const now = Date.now()
    const created = new Date(dateStr).getTime()
    const diffMinutes = Math.floor((now - created) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes}분 전`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`
    return `${Math.floor(diffMinutes / 1440)}일 전`
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-sm text-gray-500">작업 상태를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">백그라운드 작업 모니터링</h1>
          {error && (
            <p className="text-sm text-red-500 mt-1">⚠️ {error}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadData()} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 - 간소화된 버전 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <FileAudio className="w-5 h-5 text-purple-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">Whisper 대기</div>
              <div className="text-xl font-bold">{data?.stats?.pendingWhisper ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Brain className="w-5 h-5 text-blue-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">AI 분석 대기</div>
              <div className="text-xl font-bold">{data?.stats?.pendingAI ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">최근 완료</div>
              <div className="text-xl font-bold">{data?.stats?.recentCompleted ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-gray-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">총 처리됨</div>
              <div className="text-xl font-bold">{data?.stats?.totalProcessed ?? 0}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 작업 목록들 */}
      {(data?.activeWhisperTasks?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <FileAudio className="w-4 h-4 mr-2 text-purple-500" />
              Whisper 변환 대기 중 ({data?.activeWhisperTasks?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.activeWhisperTasks ?? []).slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    {task.user.full_name || task.user.email} • {getTaskAge(task.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs">
                    대기중
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRetry(task.id, 'whisper')}
                    disabled={retryLoading === `${task.id}-whisper`}
                    className="h-7 w-7 p-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {(data?.activeWhisperTasks?.length ?? 0) > 5 && (
              <div className="text-center text-xs text-gray-500 py-2">
                +{(data?.activeWhisperTasks?.length ?? 0) - 5}개 더 있음
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI 분석 대기 작업 */}
      {(data?.activeAITasks?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Brain className="w-4 h-4 mr-2 text-blue-500" />
              AI 분석 대기 중 ({data?.activeAITasks?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.activeAITasks ?? []).slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    {task.user.full_name || task.user.email} • {getTaskAge(task.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                    대기중
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRetry(task.id, 'ai')}
                    disabled={retryLoading === `${task.id}-ai`}
                    className="h-7 w-7 p-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {(data?.activeAITasks?.length ?? 0) > 5 && (
              <div className="text-center text-xs text-gray-500 py-2">
                +{(data?.activeAITasks?.length ?? 0) - 5}개 더 있음
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 모든 작업 완료 */}
      {(data?.activeWhisperTasks?.length ?? 0) === 0 && (data?.activeAITasks?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <div className="text-lg font-medium mb-2">모든 작업이 완료되었습니다</div>
            <div className="text-sm text-gray-500">현재 대기 중인 백그라운드 작업이 없습니다.</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
