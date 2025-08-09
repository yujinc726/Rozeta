"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) {
            setAllowed(false)
            setChecking(false)
            router.replace("/")
          }
          return
        }

        // 우선순위: profiles.role → user.user_metadata.role → 기본 user
        let role: string | null = null
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
          if (!error && data?.role) {
            role = data.role
          }
        } catch (_) {}

        if (!role) {
          // fallback to auth metadata
          role = (user.user_metadata as any)?.role ?? null
        }

        const isAdmin = role === "admin" || role === "staff"
        if (isMounted) {
          setAllowed(!!isAdmin)
          setChecking(false)
          if (!isAdmin) router.replace("/")
        }
      } catch (_) {
        if (isMounted) {
          setAllowed(false)
          setChecking(false)
          router.replace("/")
        }
      }
    })()
    return () => { isMounted = false }
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        관리자 권한 확인 중...
      </div>
    )
  }

  if (!allowed) return null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="h-14 flex items-center px-4 font-semibold">Admin</div>
          <nav className="flex-1 p-2 text-sm">
            <a href="/admin" className="block rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">대시보드</a>
            <a href="/admin/users" className="block rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">사용자</a>
            <a href="/admin/recordings" className="block rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">녹음</a>
            <a href="/admin/tasks" className="block rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">작업</a>
            <a href="/admin/analytics" className="block rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">분석</a>
            <a href="/admin/settings" className="block rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">설정</a>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center justify-between">
            <div className="font-semibold">관리자 페이지</div>
            <button onClick={() => router.push("/")} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">홈으로</button>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}


