"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Row = {
  id: string
  title: string
  user_id: string
  created_at: string
  duration: number | null
}

export default function AdminRecordingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('recordings')
          .select('id, title, user_id, created_at, duration')
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) throw error
        if (mounted) setRows(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">녹음</h1>
      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">제목</th>
                <th className="text-left px-3 py-2">사용자</th>
                <th className="text-left px-3 py-2">생성일</th>
                <th className="text-left px-3 py-2">길이</th>
                <th className="text-right px-3 py-2">액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-top border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => window.location.href = `/admin/recordings/${r.id}`}>
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.user_id}</td>
                  <td className="px-3 py-2">{r.created_at?.slice(0, 19).replace('T',' ')}</td>
                  <td className="px-3 py-2">{r.duration ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
                        const res = await fetch(`/api/admin/recordings/${r.id}/delete`, { method: 'POST' })
                        if (res.ok) setRows(prev => prev.filter(x => x.id !== r.id))
                      }}
                      className="text-xs rounded px-2 py-1 border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


