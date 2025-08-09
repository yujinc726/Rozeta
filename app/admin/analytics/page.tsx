"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Calendar, TrendingUp, Users, FileAudio, RefreshCw } from "lucide-react"

type AnalyticsData = {
  period: string
  charts: {
    signups: Array<{ date: string; count: number }>
    recordings: Array<{ date: string; count: number }>
    processed: Array<{ date: string; count: number }>
  }
  userRanking: Array<{
    userId: string
    name: string
    recordingCount: number
  }>
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`)
      const result = await res.json()
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatXAxisLabel = (dateStr: string) => {
    if (period === '7d' || period === '30d') {
      // YYYY-MM-DD -> MM/DD
      const [, month, day] = dateStr.split('-')
      return `${month}/${day}`
    } else {
      // 주간 단위: YYYY-W## -> W##
      return dateStr.split('-')[1]
    }
  }

  const getChartColor = (type: 'signups' | 'recordings' | 'processed') => {
    switch (type) {
      case 'signups': return '#8b5cf6' // purple
      case 'recordings': return '#3b82f6' // blue  
      case 'processed': return '#10b981' // green
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">분석 데이터를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">서비스 분석</h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="90d">최근 90일</SelectItem>
              <SelectItem value="1y">최근 1년</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 신규 가입 차트 */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">신규 가입</CardTitle>
            <Users className="w-4 h-4 ml-auto text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.charts.signups || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisLabel}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `날짜: ${label}`}
                    formatter={(value) => [value, '가입 수']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={getChartColor('signups')}
                    strokeWidth={2}
                    dot={{ fill: getChartColor('signups'), strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 녹음 생성 차트 */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">녹음 생성</CardTitle>
            <FileAudio className="w-4 h-4 ml-auto text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.recordings || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisLabel}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `날짜: ${label}`}
                    formatter={(value) => [value, '녹음 수']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={getChartColor('recordings')}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 처리 완료 차트 */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 처리 완료</CardTitle>
            <TrendingUp className="w-4 h-4 ml-auto text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.charts.processed || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisLabel}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `날짜: ${label}`}
                    formatter={(value) => [value, '완료 수']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={getChartColor('processed')}
                    strokeWidth={2}
                    dot={{ fill: getChartColor('processed'), strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 활성 사용자 순위 */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자 TOP 10</CardTitle>
            <Calendar className="w-4 h-4 ml-auto text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(data?.userRanking || []).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium text-sm truncate max-w-40">{user.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{user.userId.slice(0, 8)}...</div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    {user.recordingCount}개
                  </Badge>
                </div>
              ))}
              {(!data?.userRanking || data.userRanking.length === 0) && (
                <div className="text-center text-sm text-gray-500 py-8">
                  해당 기간에 활동한 사용자가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
