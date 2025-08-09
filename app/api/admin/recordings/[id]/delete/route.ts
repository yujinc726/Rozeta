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

    const recordingId = params.id

    // 기존 데이터 포착 (감사 로그용)
    const { data: beforeData } = await supabaseAdmin
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    const { error } = await supabaseAdmin
      .from('recordings')
      .delete()
      .eq('id', recordingId)
    if (error) throw error

    await writeAuditLog({
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'delete_recording',
      entity_type: 'recording',
      entity_id: recordingId,
      before: beforeData || null,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}


