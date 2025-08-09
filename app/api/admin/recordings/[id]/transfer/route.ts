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
    const { targetUserId } = body
    const recordingId = params.id

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 })
    }

    // 대상 사용자 확인
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
    if (userError || !targetUser.user) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // 녹음 정보 확인
    const { data: recording, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('id, title, user_id, subject_id')
      .eq('id', recordingId)
      .single()

    if (recError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    const oldUserId = recording.user_id

    // 녹음 소유자 변경
    const { error: updateError } = await supabaseAdmin
      .from('recordings')
      .update({ user_id: targetUserId })
      .eq('id', recordingId)

    if (updateError) throw updateError

    // record_entries도 함께 이전
    await supabaseAdmin
      .from('record_entries')
      .update({ user_id: targetUserId })
      .eq('recording_id', recordingId)

    await writeAuditLog({
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'transfer_recording',
      entity_type: 'recording',
      entity_id: recordingId,
      before: { user_id: oldUserId },
      after: { user_id: targetUserId }
    })

    return NextResponse.json({ 
      ok: true, 
      message: `녹음이 ${targetUser.user.email}로 이전되었습니다.` 
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
