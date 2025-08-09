import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const recordingId = params.id

    // 녹음 정보 (사용자/과목 정보 포함)
    const { data: recording, error } = await supabaseAdmin
      .from('recordings')
      .select(`
        *,
        subject:subjects(id, name),
        user:profiles(id, full_name, email)
      `)
      .eq('id', recordingId)
      .single()

    if (error || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    // 슬라이드 기록 수
    const { count: recordEntriesCount } = await supabaseAdmin
      .from('record_entries')
      .select('id', { count: 'exact', head: true })
      .eq('recording_id', recordingId)

    // AI 처리 상태 확인 (간단히 필드 기반으로)
    const processingStatus = {
      hasTranscript: !!recording.transcript,
      hasSubtitles: !!recording.subtitles,
      hasAIAnalysis: !!recording.ai_lecture_overview,
      transcriptAt: recording.created_at, // transcript 생성 시간은 별도 추적 필요
      aiAnalyzedAt: recording.ai_analyzed_at
    }

    return NextResponse.json({
      recording,
      recordEntriesCount: recordEntriesCount || 0,
      processingStatus
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
