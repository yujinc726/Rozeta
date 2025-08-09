import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserAndRole } from '@/lib/server-auth'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    const anyReq: any = req
    const { user, role } = await getUserAndRole(anyReq)
    if (!user || (role !== 'admin' && role !== 'staff')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { recordingId, taskType } = body // taskType: 'whisper' | 'ai'

    if (!recordingId || !taskType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 녹음 정보 확인
    const { data: recording, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('id, title, user_id, transcript, ai_lecture_overview')
      .eq('id', recordingId)
      .single()

    if (recError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    if (taskType === 'whisper') {
      // Whisper 작업 재시도 - transcript/subtitles 초기화
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
        action: 'retry_whisper_task',
        entity_type: 'recording',
        entity_id: recordingId,
        before: { hasTranscript: !!recording.transcript },
        after: { hasTranscript: false, retryRequested: true }
      })

      return NextResponse.json({ 
        ok: true, 
        message: 'Whisper 작업이 재시도를 위해 초기화되었습니다.' 
      })
    }

    if (taskType === 'ai') {
      // AI 작업 재시도 - AI 관련 필드 초기화  
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
        action: 'retry_ai_task',
        entity_type: 'recording',
        entity_id: recordingId,
        before: { hasAI: !!recording.ai_lecture_overview },
        after: { hasAI: false, retryRequested: true }
      })

      return NextResponse.json({ 
        ok: true, 
        message: 'AI 분석 작업이 재시도를 위해 초기화되었습니다.' 
      })
    }

    return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
