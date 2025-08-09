import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    // 총 사용자 (profiles 기준)
    const { error: usersErr, count: usersCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    if (usersErr) throw usersErr

    // 총 녹음
    const { error: recErr, count: recCount } = await supabaseAdmin
      .from('recordings')
      .select('id', { count: 'exact', head: true })
    if (recErr) throw recErr

    // 스토리지 사용량 (있다면 user_usage_summary 합계, 없으면 0)
    let storageUsedBytes = 0
    try {
      const { data, error } = await supabaseAdmin
        .from('user_usage_summary')
        .select('storage_used_bytes')
      if (!error && Array.isArray(data) && data.length > 0) {
        storageUsedBytes = data.reduce((acc: number, row: any) => acc + (Number(row.storage_used_bytes) || 0), 0)
      }
    } catch {}
    // 추가 폴백: recordings의 파일 크기 합산
    if (!storageUsedBytes || storageUsedBytes < 0) {
      try {
        const { data: recs, error: recErr } = await supabaseAdmin
          .from('recordings')
          .select('file_size_bytes, pdf_size_bytes')
        if (!recErr && Array.isArray(recs)) {
          storageUsedBytes = recs.reduce((acc: number, r: any) => acc + (Number(r.file_size_bytes) || 0) + (Number(r.pdf_size_bytes) || 0), 0)
        }
      } catch {}
    }

    return NextResponse.json({
      totalUsers: usersCount ?? 0,
      totalRecordings: recCount ?? 0,
      storageUsedBytes,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics failed' }, { status: 500 })
  }
}


