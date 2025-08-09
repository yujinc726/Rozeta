import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || '7d' // 7d, 30d, 90d, 1y

    let dateFilter = ''
    const now = new Date()
    
    switch (period) {
      case '7d':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${sevenDaysAgo.toISOString()}'`
        break
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${thirtyDaysAgo.toISOString()}'`
        break
      case '90d':
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${ninetyDaysAgo.toISOString()}'`
        break
      case '1y':
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${oneYearAgo.toISOString()}'`
        break
    }

    // 일별 신규 사용자 (profiles 테이블 기준)
    const { data: dailySignups, error: signupError } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .gte('created_at', dateFilter.split("'")[1])
      .order('created_at')

    // 일별 녹음 생성
    const { data: dailyRecordings, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .select('created_at')
      .gte('created_at', dateFilter.split("'")[1])
      .order('created_at')

    // 일별 처리 완료 (transcript + AI 완료)
    const { data: dailyProcessed, error: processedError } = await supabaseAdmin
      .from('recordings')
      .select('ai_analyzed_at')
      .not('transcript', 'is', null)
      .not('ai_lecture_overview', 'is', null)
      .not('ai_analyzed_at', 'is', null)
      .gte('ai_analyzed_at', dateFilter.split("'")[1])
      .order('ai_analyzed_at')

    // 사용자별 활동 통계
    const { data: userActivity, error: userActivityError } = await supabaseAdmin
      .from('recordings')
      .select(`
        user_id,
        user:profiles(full_name, email),
        created_at
      `)
      .gte('created_at', dateFilter.split("'")[1])

    // 데이터 가공
    const processChartData = (data: any[], dateField: string, period: string) => {
      if (!data) return []
      
      const grouped = data.reduce((acc, item) => {
        let dateKey = ''
        if (period === '7d') {
          dateKey = new Date(item[dateField]).toISOString().split('T')[0] // YYYY-MM-DD
        } else if (period === '30d') {
          dateKey = new Date(item[dateField]).toISOString().split('T')[0]
        } else {
          // 90d, 1y는 주간 단위로
          const date = new Date(item[dateField])
          const year = date.getFullYear()
          const week = Math.ceil((date.getDate() - date.getDay()) / 7)
          dateKey = `${year}-W${week.toString().padStart(2, '0')}`
        }
        
        acc[dateKey] = (acc[dateKey] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return Object.entries(grouped).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date))
    }

    const signupChart = processChartData(dailySignups || [], 'created_at', period)
    const recordingChart = processChartData(dailyRecordings || [], 'created_at', period)
    const processedChart = processChartData(dailyProcessed || [], 'ai_analyzed_at', period)

    // 활성 사용자 순위 (녹음 수 기준)
    const userRanking = Object.entries(
      (userActivity || []).reduce((acc, item) => {
        const userId = item.user_id
        const userName = item.user?.full_name || item.user?.email || 'Unknown'
        acc[userId] = {
          name: userName,
          count: (acc[userId]?.count || 0) + 1
        }
        return acc
      }, {} as Record<string, { name: string, count: number }>)
    )
    .map(([userId, data]) => ({
      userId,
      name: data.name,
      recordingCount: data.count
    }))
    .sort((a, b) => b.recordingCount - a.recordingCount)
    .slice(0, 10) // 상위 10명

    return NextResponse.json({
      period,
      charts: {
        signups: signupChart,
        recordings: recordingChart,
        processed: processedChart
      },
      userRanking
    })
  } catch (e: any) {
    console.error('Analytics error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
