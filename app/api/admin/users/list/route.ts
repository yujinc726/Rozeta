import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    // auth 사용자 목록(서비스 롤 필요)
    // supabase-js v2: auth.admin.listUsers
    const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUsers = list?.data?.users || []
    const userIds = authUsers.map(u => u.id)

    // profiles에서 보조 정보(이름/역할) 병합
    let profileMap = new Map<string, { full_name: string | null, role: string | null, created_at: string | null }>()
    if (userIds.length > 0) {
      const { data: profiles, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, created_at')
        .in('id', userIds)
      if (!profErr && Array.isArray(profiles)) {
        for (const p of profiles) {
          profileMap.set(p.id, {
            full_name: p.full_name ?? null,
            role: p.role ?? null,
            created_at: p.created_at ?? null,
          })
        }
      }
    }

    const merged = authUsers.map(u => {
      const prof = profileMap.get(u.id) || { full_name: null, role: null, created_at: u.created_at || null }
      return {
        id: u.id,
        email: u.email,
        full_name: prof.full_name,
        role: prof.role ?? 'user',
        created_at: prof.created_at || u.created_at || null,
      }
    })

    // 최신 가입 순 정렬
    merged.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

    return NextResponse.json({ users: merged })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}


