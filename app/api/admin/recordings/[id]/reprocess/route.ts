import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserAndRole } from '@/lib/server-auth'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const anyReq: any = req
    const { user, role } = await getUserAndRole(anyReq)
    if (!user || (role !== 'admin' && role !== 'staff')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { type } = body // 'whisper' | 'ai'
    const recordingId = params.id

    // 녹음 정보 확인
    const { data: recording, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('id, title, audio_url, user_id')
      .eq('id', recordingId)
      .single()

    if (recError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    if (type === 'whisper') {
      // Whisper 재처리: transcript, subtitles 필드 초기화
      const { error: updateError } = await supabaseAdmin
        .from('recordings')
        .update({ 
          transcript: null, 
          subtitles: null 
        })
        .eq('id', recordingId)

      if (updateError) throw updateError

      await writeAuditLog({
        actor_user_id: user.id,
        actor_email: user.email,
        action: 'reprocess_whisper',
        entity_type: 'recording',
        entity_id: recordingId,
        before: { hasTranscript: true },
        after: { hasTranscript: false }
      })

      return NextResponse.json({ 
        ok: true, 
        message: 'Whisper 재처리가 준비되었습니다. 사용자가 다시 변환을 시작할 수 있습니다.' 
      })
    }

    if (type === 'ai') {
      // AI 재처리: AI 관련 필드 초기화
      const { error: updateError } = await supabaseAdmin
        .from('recordings')
        .update({ 
          ai_lecture_overview: null,
          ai_analyzed_at: null
        })
        .eq('id', recordingId)

      if (updateError) throw updateError

      // record_entries의 AI 설명도 초기화
      await supabaseAdmin
        .from('record_entries')
        .update({ 
          ai_explanation: null,
          ai_generated_at: null,
          ai_model: null
        })
        .eq('recording_id', recordingId)

      await writeAuditLog({
        actor_user_id: user.id,
        actor_email: user.email,
        action: 'reprocess_ai',
        entity_type: 'recording',
        entity_id: recordingId,
        before: { hasAI: true },
        after: { hasAI: false }
      })

      return NextResponse.json({ 
        ok: true, 
        message: 'AI 재처리가 준비되었습니다. 사용자가 다시 분석을 시작할 수 있습니다.' 
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
