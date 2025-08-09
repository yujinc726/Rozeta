import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserAndRole } from '@/lib/server-auth'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // 권한 확인 (admin/staff만 허용, 단 staff는 admin으로 승격 불가 등 세분화는 추후)
    // NextRequest 사용 위해 any 캐스팅
    const anyReq: any = req
    const { user, role: actorRole } = await getUserAndRole(anyReq)
    if (!user || (actorRole !== 'admin' && actorRole !== 'staff')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const role = body?.role as 'user' | 'staff' | 'admin'
    if (!role || !['user','staff','admin'].includes(role)) {
      return NextResponse.json({ error: 'invalid role' }, { status: 400 })
    }

    const userId = params.id
    const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', userId)
    if (error) throw error

    // 감사 로그 기록
    await writeAuditLog({
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'change_role',
      entity_type: 'profile',
      entity_id: userId,
      after: { role },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}


