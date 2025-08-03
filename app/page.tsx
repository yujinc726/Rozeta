"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/supabase"
import HomePage from "./components/home-page"
import MainApp from "./components/main-app"
import AuthPage from "./components/auth-page"
import type { User } from "@supabase/supabase-js"

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMainApp, setShowMainApp] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    // 초기 세션 체크
    auth.getSession().then((session) => {
      setUser(session?.user || null)
      if (session?.user) {
        setShowMainApp(true)
      }
      setLoading(false)
    })

    // 인증 상태 변경 리스너
    const { data: authListener } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        setShowMainApp(true)
        setShowAuth(false)
      } else {
        setShowMainApp(false)
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const handleGetStarted = () => {
    if (user) {
      setShowMainApp(true)
    } else {
      setShowAuth(true)
    }
  }

  const handleBackToHome = () => {
    setShowMainApp(false)
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
    setShowMainApp(true)
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

  if (showAuth) {
    return <AuthPage onSuccess={handleAuthSuccess} />
  }

  if (user && showMainApp) {
    return <MainApp onBackToHome={handleBackToHome} />
  }

  return <HomePage onGetStarted={handleGetStarted} />
}