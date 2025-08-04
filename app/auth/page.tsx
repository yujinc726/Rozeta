"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import AuthPage from "@/app/components/auth-page"
import { auth } from "@/lib/supabase"

export default function AuthRoutePage() {
  const router = useRouter()

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로 리다이렉트
    const checkAuth = async () => {
      const { data: { user } } = await auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const handleAuthSuccess = () => {
    router.push('/dashboard')
  }

  return <AuthPage onSuccess={handleAuthSuccess} />
}