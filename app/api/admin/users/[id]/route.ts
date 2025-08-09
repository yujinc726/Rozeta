import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    // Auth 사용자 정보
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 프로필 정보
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // 구독 정보
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    // 사용량 요약
    const { data: usage } = await supabaseAdmin
      .from('user_usage_summary')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 과목/녹음 통계
    const { count: subjectsCount } = await supabaseAdmin
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: recordingsCount } = await supabaseAdmin
      .from('recordings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    // 최근 녹음 5개
    const { data: recentRecordings } = await supabaseAdmin
      .from('recordings')
      .select('id, title, created_at, duration')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      authUser: authUser.user,
      profile: profile || null,
      subscription: subscription || null,
      usage: usage || null,
      stats: {
        subjectsCount: subjectsCount || 0,
        recordingsCount: recordingsCount || 0,
      },
      recentRecordings: recentRecordings || []
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
