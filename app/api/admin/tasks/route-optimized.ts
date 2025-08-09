import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  try {
    // 병렬로 모든 쿼리 실행 - 성능 최적화
    const [
      whisperTasksResult,
      aiTasksResult,
      recentCompletedResult,
      totalProcessedResult
    ] = await Promise.all([
      // Whisper 대기 작업 (transcript 또는 subtitles가 null)
      supabaseAdmin
        .from('recordings')
        .select(`
          id,
          title,
          user_id,
          created_at,
          updated_at,
          user:profiles!inner(full_name, email)
        `)
        .or('transcript.is.null,subtitles.is.null')
        .order('updated_at', { ascending: false })
        .limit(20), // 제한으로 성능 향상

      // AI 분석 대기 작업 (transcript는 있지만 ai_lecture_overview가 null)
      supabaseAdmin
        .from('recordings')
        .select(`
          id,
          title,
          user_id,
          created_at,
          updated_at,
          user:profiles!inner(full_name, email)
        `)
        .is('ai_lecture_overview', null)
        .not('transcript', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20),

      // 최근 완료된 작업 (AI 분석까지 완료)
      supabaseAdmin
        .from('recordings')
        .select(`
          id,
          title,
          user_id,
          ai_analyzed_at,
          created_at,
          user:profiles!inner(full_name, email)
        `)
        .not('transcript', 'is', null)
        .not('ai_lecture_overview', 'is', null)
        .not('ai_analyzed_at', 'is', null)
        .order('ai_analyzed_at', { ascending: false })
        .limit(10),

      // 총 처리된 작업 수 (count만)
      supabaseAdmin
        .from('recordings')
        .select('id', { count: 'exact', head: true })
        .not('transcript', 'is', null)
        .not('ai_lecture_overview', 'is', null)
    ])

    // 에러 체크
    if (whisperTasksResult.error) throw whisperTasksResult.error
    if (aiTasksResult.error) throw aiTasksResult.error
    if (recentCompletedResult.error) throw recentCompletedResult.error
    if (totalProcessedResult.error) throw totalProcessedResult.error

    // 통계 계산
    const stats = {
      pendingWhisper: whisperTasksResult.data?.length || 0,
      pendingAI: aiTasksResult.data?.length || 0,
      recentCompleted: recentCompletedResult.data?.length || 0,
      totalProcessed: totalProcessedResult.count || 0
    }

    return NextResponse.json({
      stats,
      activeWhisperTasks: whisperTasksResult.data || [],
      activeAITasks: aiTasksResult.data || [],
      recentCompleted: recentCompletedResult.data || []
    })
  } catch (e: any) {
    console.error('Tasks API error:', e)
    return NextResponse.json({ 
      error: e?.message || 'failed',
      stats: { pendingWhisper: 0, pendingAI: 0, recentCompleted: 0, totalProcessed: 0 },
      activeWhisperTasks: [],
      activeAITasks: [],
      recentCompleted: []
    }, { status: 500 })
  }
}
