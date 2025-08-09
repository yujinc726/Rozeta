import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  try {
    // 현재 실행 중인 작업들을 파악하기 위해 recordings 테이블 스캔
    const { data: activeWhisperTasks, error: whisperError } = await supabaseAdmin
      .from('recordings')
      .select(`
        id,
        title,
        user_id,
        transcript,
        subtitles,
        created_at,
        updated_at,
        user:profiles(full_name, email)
      `)
      .or('transcript.is.null,subtitles.is.null')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (whisperError) throw whisperError

    const { data: activeAITasks, error: aiError } = await supabaseAdmin
      .from('recordings')
      .select(`
        id,
        title,
        user_id,
        ai_lecture_overview,
        ai_analyzed_at,
        created_at,
        updated_at,
        user:profiles(full_name, email)
      `)
      .is('ai_lecture_overview', null)
      .not('transcript', 'is', null) // transcript가 있는 것만 (AI 분석 가능한 상태)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (aiError) throw aiError

    // 최근 완료된 작업들
    const { data: recentCompleted, error: completedError } = await supabaseAdmin
      .from('recordings')
      .select(`
        id,
        title,
        user_id,
        transcript,
        ai_lecture_overview,
        ai_analyzed_at,
        created_at,
        updated_at,
        user:profiles(full_name, email)
      `)
      .not('transcript', 'is', null)
      .not('ai_lecture_overview', 'is', null)
      .order('ai_analyzed_at', { ascending: false })
      .limit(20)

    if (completedError) throw completedError

    // 통계 계산
    const stats = {
      pendingWhisper: activeWhisperTasks?.length || 0,
      pendingAI: activeAITasks?.length || 0,
      recentCompleted: recentCompleted?.length || 0,
      totalProcessed: 0 // 전체 처리된 작업 수는 별도 계산 필요
    }

    // 전체 처리된 작업 수 계산
    const { count: totalProcessedCount } = await supabaseAdmin
      .from('recordings')
      .select('id', { count: 'exact', head: true })
      .not('transcript', 'is', null)
      .not('ai_lecture_overview', 'is', null)

    stats.totalProcessed = totalProcessedCount || 0

    return NextResponse.json({
      stats,
      activeWhisperTasks: activeWhisperTasks || [],
      activeAITasks: activeAITasks || [],
      recentCompleted: recentCompleted || []
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
