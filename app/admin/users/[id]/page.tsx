"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Settings, Activity, FileText } from "lucide-react"

type UserDetail = {
  authUser: any
  profile: any
  subscription: any
  usage: any
  stats: {
    subjectsCount: number
    recordingsCount: number
  }
  recentRecordings: any[]
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`)
        const result = await res.json()
        if (mounted) setData(result)
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [userId])

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
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">사용자 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!data || !data.authUser) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-red-500">사용자를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>
        <h1 className="text-xl font-semibold">사용자 상세</h1>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
            <User className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">이메일</div>
              <div className="font-mono text-sm">{data.authUser.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">이름</div>
              <div className="text-sm">{data.profile?.full_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">역할</div>
              <Badge className="text-xs">
                {data.profile?.role || 'user'}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-gray-500">가입일</div>
              <div className="text-sm">{new Date(data.authUser.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">최근 로그인</div>
              <div className="text-sm">{data.authUser.last_sign_in_at ? new Date(data.authUser.last_sign_in_at).toLocaleDateString() : '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">구독 정보</CardTitle>
            <Settings className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.subscription ? (
              <>
                <div>
                  <div className="text-xs text-gray-500">플랜</div>
                  <div className="text-sm font-medium">{data.subscription.plan?.display_name || data.subscription.plan?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">상태</div>
                  <Badge className={`text-xs ${data.subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {data.subscription.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-500">만료일</div>
                  <div className="text-sm">{data.subscription.expires_at ? new Date(data.subscription.expires_at).toLocaleDateString() : '무제한'}</div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">구독 정보가 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 사용량 및 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">과목 수</CardTitle>
            <FileText className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.subjectsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">녹음 수</CardTitle>
            <Activity className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.recordingsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">스토리지 사용량</CardTitle>
            <Activity className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.usage ? formatBytes(data.usage.storage_used_bytes) : '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 사용량</CardTitle>
            <Activity className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.usage ? `${data.usage.ai_minutes_used}분` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 녹음 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">최근 녹음</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentRecordings.length > 0 ? (
            <div className="space-y-3">
              {data.recentRecordings.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-sm">{rec.title}</div>
                    <div className="text-xs text-gray-500">{new Date(rec.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {rec.duration ? formatDuration(rec.duration) : '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">녹음이 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
