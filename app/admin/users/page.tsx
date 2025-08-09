"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type UserRow = {
  id: string
  email?: string | null
  full_name: string | null
  role: string | null
  created_at: string | null
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/admin/users/list', { cache: 'no-store' })
        const payload = await res.json()
        const data = payload.users as any[]
        const mapped: UserRow[] = (data || []).map((p: any) => ({
          id: p.id,
          email: p.email ?? null,
          full_name: p.full_name ?? null,
          role: p.role ?? 'user',
          created_at: p.created_at ?? null,
        }))
        if (mounted) setRows(mapped)
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
      <h1 className="text-xl font-semibold">사용자</h1>
      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">이메일</th>
                <th className="text-left px-3 py-2">이름</th>
                <th className="text-left px-3 py-2">역할</th>
                <th className="text-left px-3 py-2">가입일</th>
                <th className="text-right px-3 py-2">액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => window.location.href = `/admin/users/${r.id}`}>
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2">{r.email ?? '—'}</td>
                  <td className="px-3 py-2">{r.full_name ?? '—'}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">{r.role ?? 'user'}</span></td>
                  <td className="px-3 py-2">{r.created_at?.slice(0,10) ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <select
                      className="text-xs bg-transparent border rounded px-2 py-1"
                      value={r.role ?? 'user'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        e.stopPropagation()
                        const role = e.target.value
                        const res = await fetch(`/api/admin/users/${r.id}/role`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ role })
                        })
                        if (res.ok) {
                          setRows(prev => prev.map(x => x.id === r.id ? { ...x, role } : x))
                        }
                      }}
                    >
                      <option value="user">user</option>
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </select>
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


