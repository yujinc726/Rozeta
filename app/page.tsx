"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/supabase"
import HomePage from "@/app/components/home-page"
import type { User } from "@supabase/supabase-js"

export default function App() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 체크
    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    // 인증 상태 변경 리스너
    const { data: authListener } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  // 로그인된 사용자는 대시보드로 자동 리다이렉트
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/auth')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return <HomePage onGetStarted={handleGetStarted} />
}