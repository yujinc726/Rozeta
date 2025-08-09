"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/supabase"
import SharedSidebar from "@/app/components/shared-sidebar"
import { subjects as subjectsDb, recordings as recordingsDb } from "@/lib/database"
import type { Subject as DbSubject } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { SidebarProvider, useSidebarContext } from "@/app/contexts/sidebar-context"
import { SubtitleSettingsProvider } from "@/app/contexts/subtitle-settings-context"
import { ThemeProvider } from "@/app/contexts/theme-context"
import { RecordingProvider } from "@/app/contexts/recording-context"
import { WhisperProvider } from "@/app/contexts/whisper-context"
import { AIAnalysisProvider } from "@/app/contexts/ai-analysis-context"
import FloatingRecorder from "@/app/components/floating-recorder"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Sparkles } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

function ProtectedLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [subjects, setSubjects] = useState<DbSubject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<DbSubject | null>(null)
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useSidebarContext()
  const [isLoading, setIsLoading] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const isMobile = useIsMobile()

  // 현재 경로에서 subject ID 추출
  const getSubjectIdFromPath = () => {
    const match = pathname.match(/\/subjects\/([^\/]+)/)
    return match ? match[1] : null
  }

  // 현재 뷰 감지
  const getCurrentView = () => {
    if (pathname === '/dashboard') return 'home'
    if (pathname === '/settings') return 'settings'
    if (pathname.includes('/record')) return 'record'
    if (pathname.includes('/recordings/')) return 'detail'
    if (pathname.includes('/subjects/')) return 'main'
    return 'home'
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }
        setUser(user)
        
        // 과목 목록 불러오기
        const subs = await subjectsDb.list(user.id)
        
        // 각 과목의 녹음 수 계산
        const subjectsWithCounts = await Promise.all(
          subs.map(async (subject) => {
            const recordings = await recordingsDb.list(subject.id)
            return {
              ...subject,
              recordingCount: recordings.length,
              timerCount: 0 // 타이머 기능은 제거됨
            }
          })
        )
        
        setSubjects(subjectsWithCounts)
        
        // URL에서 현재 선택된 과목 설정
        const subjectId = getSubjectIdFromPath()
        if (subjectId) {
          const subject = subjectsWithCounts.find(s => s.id === subjectId)
          setSelectedSubject(subject || null)
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error in auth check:', error)
        router.push('/auth')
      }
    }

    checkAuth()

    // 인증 상태 변경 리스너
    const { data: authListener } = auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push('/auth')
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [router, pathname])

  const handleAddSubject = async (name: string) => {
    if (!user) return
    
    try {
      const newSubject = await subjectsDb.create({
        name,
        user_id: user.id
      })
      
      const updatedSubjects = await subjectsDb.list(user.id)
      setSubjects(updatedSubjects)
      
      toast.success('과목이 추가되었습니다.')
      return newSubject
    } catch (error) {
      console.error('Error adding subject:', error)
      toast.error('과목 추가 중 오류가 발생했습니다.')
      throw error
    }
  }

  const handleEditSubject = async (id: string, name: string) => {
    if (!user) return
    
    try {
      await subjectsDb.update(id, { name })
      
      const updatedSubjects = await subjectsDb.list(user.id)
      setSubjects(updatedSubjects)
      
      if (selectedSubject?.id === id) {
        setSelectedSubject({ ...selectedSubject, name })
      }
      
      toast.success('과목이 수정되었습니다.')
    } catch (error) {
      console.error('Error editing subject:', error)
      toast.error('과목 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (!user) return
    
    try {
      await subjectsDb.delete(id)
      
      const updatedSubjects = await subjectsDb.list(user.id)
      setSubjects(updatedSubjects)
      
      if (selectedSubject?.id === id) {
        setSelectedSubject(null)
        router.push('/dashboard')
      }
      
      toast.success('과목이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('과목 삭제 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 데스크톱 사이드바 */}
      {!isMobile && (
        <SharedSidebar
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSelectSubject={(subject) => {
            router.push(`/subjects/${subject.id}`)
          }}
          onAddSubject={handleAddSubject}
          onEditSubject={handleEditSubject}
          onDeleteSubject={handleDeleteSubject}
          onBackToHome={() => router.push('/')}
          onNavigateHome={() => {
            setSelectedSubject(null)
            router.push('/dashboard')
          }}
          onOpenSettings={() => router.push('/settings')}
          currentView={getCurrentView()}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* 모바일 드로어 */}
      {isMobile && (
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <VisuallyHidden.Root>
              <SheetHeader>
                <SheetTitle>메뉴</SheetTitle>
              </SheetHeader>
            </VisuallyHidden.Root>
            <SharedSidebar
              subjects={subjects}
              selectedSubject={selectedSubject}
              onSelectSubject={(subject) => {
                router.push(`/subjects/${subject.id}`)
                setMobileDrawerOpen(false)
              }}
              onAddSubject={handleAddSubject}
              onEditSubject={handleEditSubject}
              onDeleteSubject={handleDeleteSubject}
              onBackToHome={() => {
                router.push('/')
                setMobileDrawerOpen(false)
              }}
              onNavigateHome={() => {
                setSelectedSubject(null)
                router.push('/dashboard')
                setMobileDrawerOpen(false)
              }}
              onOpenSettings={() => {
                router.push('/settings')
                setMobileDrawerOpen(false)
              }}
              currentView={getCurrentView()}
              isCollapsed={false}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 overflow-hidden",
        !isMobile && (isSidebarCollapsed ? "ml-16" : "ml-80")
      )}>
        {/* 모바일 헤더 */}
        {isMobile && (
          <header className="bg-white dark:bg-gray-900 safe-top">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="mobile-tap-feedback"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 mobile-tap-feedback"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text">Rozeta</span>
            </button>
            
            {/* 빈 공간 유지용 */}
            <div className="w-10" />
            </div>
          </header>
        )}
        
        {/* 페이지 컨텐츠 */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
      
      <FloatingRecorder />
    </div>
  )
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <SubtitleSettingsProvider>
          <RecordingProvider>
                    <WhisperProvider>
          <AIAnalysisProvider>
            <ProtectedLayoutContent>
              {children}
            </ProtectedLayoutContent>
          </AIAnalysisProvider>
        </WhisperProvider>
          </RecordingProvider>
        </SubtitleSettingsProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}