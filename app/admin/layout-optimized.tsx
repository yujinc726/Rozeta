"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs' // 만약 Clerk 사용한다면
// 또는 Supabase 사용 시
// import { useSupabaseUser } from '@/hooks/use-supabase-user'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        // 빠른 권한 체크 - 캐시된 정보 우선 사용
        const cachedRole = sessionStorage.getItem('user_role')
        const cacheTime = sessionStorage.getItem('role_cache_time')
        const now = Date.now()
        
        // 5분 이내 캐시가 있으면 즉시 사용
        if (cachedRole && cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
          if (cachedRole === 'admin' || cachedRole === 'staff') {
            setUserRole(cachedRole)
            setIsAuthorized(true)
            return
          } else {
            router.replace('/')
            return
          }
        }

        // 캐시가 없거나 만료된 경우 서버 확인
        const response = await fetch('/api/admin/auth-check', {
          method: 'GET',
          credentials: 'include'
        })

        if (!mounted) return

        if (response.ok) {
          const { role } = await response.json()
          if (role === 'admin' || role === 'staff') {
            setUserRole(role)
            setIsAuthorized(true)
            // 결과 캐시
            sessionStorage.setItem('user_role', role)
            sessionStorage.setItem('role_cache_time', now.toString())
          } else {
            setIsAuthorized(false)
            router.replace('/')
          }
        } else {
          setIsAuthorized(false)
          router.replace('/auth')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        if (mounted) {
          setIsAuthorized(false)
          router.replace('/auth')
        }
      }
    }

    checkAuth()
    return () => { mounted = false }
  }, [router])

  // 권한 체크 중일 때 로딩 스피너 (최소한의 UI)
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // 권한이 없으면 아무것도 렌더링하지 않음 (리다이렉트 대기)
  if (!isAuthorized) {
    return null
  }

  // 권한이 있으면 실제 레이아웃 렌더링
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-gray-200 bg-white">
          <div className="h-14 flex items-center px-4 font-semibold border-b">
            Admin Panel
            <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
              {userRole?.toUpperCase()}
            </span>
          </div>
          <nav className="flex-1 p-2 text-sm space-y-1">
            <a href="/admin" className="block rounded-md px-3 py-2 hover:bg-gray-100 transition-colors">
              📊 대시보드
            </a>
            <a href="/admin/users" className="block rounded-md px-3 py-2 hover:bg-gray-100 transition-colors">
              👥 사용자
            </a>
            <a href="/admin/recordings" className="block rounded-md px-3 py-2 hover:bg-gray-100 transition-colors">
              🎵 녹음
            </a>
            <a href="/admin/tasks" className="block rounded-md px-3 py-2 hover:bg-gray-100 transition-colors">
              ⚙️ 작업
            </a>
            <a href="/admin/analytics" className="block rounded-md px-3 py-2 hover:bg-gray-100 transition-colors">
              📈 분석
            </a>
            <a href="/admin/settings" className="block rounded-md px-3 py-2 hover:bg-gray-100 transition-colors">
              🔧 설정
            </a>
          </nav>
          <div className="p-4 border-t text-xs text-gray-500">
            <a href="/" className="hover:text-purple-600 transition-colors">← 서비스로 돌아가기</a>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
