"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/supabase"
import { 
  subjects as subjectsDb, 
  recordings as recordingsDb,
  subscriptionPlans,
  userSubscriptions,
  usageSummary,
  profiles
} from "@/lib/database"
import type { 
  Subject as DbSubject, 
  Recording as DbRecording,
  SubscriptionPlan,
  UserSubscription
} from "@/lib/supabase"
import UsageTracker from "@/app/components/usage-tracker"
import SubscriptionPlansModal from "@/app/components/subscription-plans-modal"
import RecentRecordings from "@/app/components/recent-recordings"
import DashboardStats from "@/app/components/dashboard-stats"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Sparkles, 
  AlertCircle,
  Users,
  Shield,
  Lightbulb
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState<string>('사용자')
  const [subjects, setSubjects] = useState<DbSubject[]>([])
  const [recordings, setRecordings] = useState<DbRecording[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageUsedDetailed, setStorageUsedDetailed] = useState<{
    audioBytes: number
    pdfBytes: number
    totalBytes: number
  } | null>(null)
  const [aiMinutesUsed, setAiMinutesUsed] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showPlansModal, setShowPlansModal] = useState(false)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 인증 확인
        const { data: { user } } = await auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }
        setUser(user)
        
        // 병렬로 데이터 로드
        const [subs, recs, availablePlans, userSub, displayName] = await Promise.all([
          subjectsDb.list(user.id),
          recordingsDb.listAll(user.id),
          subscriptionPlans.getAll(),
          userSubscriptions.getCurrent(),
          profiles.getDisplayName()
        ])
        
        setSubjects(subs)
        setRecordings(recs)
        setPlans(availablePlans)
        setSubscription(userSub)
        setUserName(displayName)
        
        console.log('대시보드 데이터:', {
          subjects: subs.length,
          recordings: recs.length,
          plans: availablePlans.length,
          subscription: userSub
        })

        // 사용량 계산
        try {
          const [storage, storageDetailed, aiMinutes] = await Promise.all([
            usageSummary.calculateStorageUsage(),
            usageSummary.calculateStorageUsageDetailed(),
            usageSummary.calculateAIMinutesUsage()
          ])
          
          setStorageUsed(storage)
          setStorageUsedDetailed(storageDetailed)
          setAiMinutesUsed(aiMinutes)
        } catch (usageError) {
          console.error('사용량 계산 에러:', usageError)
          // 기본값 사용
          setStorageUsed(0)
          setStorageUsedDetailed(null)
          setAiMinutesUsed(0)
        }
        
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">대시보드 로딩 중...</p>
        </div>
      </div>
    )
  }

  const handlePlayRecording = (recording: DbRecording) => {
    const subject = subjects.find(s => s.id === recording.subject_id)
    if (subject) {
      router.push(`/subjects/${subject.id}/recordings/${recording.id}`)
    }
  }

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    // TODO: 결제 프로세스 구현
    alert(`${plan.display_name} 플랜 선택 - 결제 기능 구현 예정`)
  }



  // 사용량 경고 체크
  const storagePercent = subscription?.plan ? 
    (storageUsed / (subscription.plan.storage_gb * 1024 * 1024 * 1024)) * 100 : 
    (storageUsed / (1024 * 1024 * 1024)) * 100 // 무료 플랜 1GB 기본값

  const aiMinutesPercent = subscription?.plan?.ai_minutes_per_month ? 
    (aiMinutesUsed / subscription.plan.ai_minutes_per_month) * 100 : 
    (aiMinutesUsed / 60) * 100 // 무료 플랜 60분 기본값

  const hasWarning = storagePercent > 80 || aiMinutesPercent > 80

  return (
    <div className="px-6 py-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* 환영 메시지 */}
      <div className="flex items-center justify-between pr-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            안녕하세요, {userName}님! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">오늘도 Rozeta와 함께 열심히 공부해봐요</p>
        </div>
        
        {/* 현재 플랜 표시 */}
        <div className={`px-4 py-3 rounded-xl shadow-sm border ${
          subscription?.plan?.name === 'premium' 
            ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 dark:border-purple-700/50' 
            : subscription?.plan?.name === 'standard'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-700/50'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200/50 dark:border-green-700/50'
        }`}>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">현재 플랜</div>
            <div className={`font-bold text-xl ${
              subscription?.plan?.name === 'premium'
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600'
                : subscription?.plan?.name === 'standard'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {subscription?.plan?.display_name || 'Free'}
            </div>
          </div>
        </div>
      </div>

      {/* 경고 알림 */}
      {hasWarning && (
        <Alert className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <span className="font-semibold">사용량 주의:</span> 
            {storagePercent > 80 && ' 저장 공간이 부족합니다.'}
            {aiMinutesPercent > 80 && ' AI 변환 시간이 얼마 남지 않았습니다.'}
            <Button 
              variant="link" 
              className="text-orange-600 dark:text-orange-400 p-0 ml-2 h-auto hover:text-orange-700 dark:hover:text-orange-300"
              onClick={() => setShowPlansModal(true)}
            >
              플랜 업그레이드 →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 대시보드 통계 */}
      <DashboardStats subjects={subjects} recordings={recordings} />

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 사용량 트래커 */}
        <div className="lg:col-span-1">
          <UsageTracker
            subscription={subscription}
            storageUsed={storageUsed}
            storageUsedDetailed={storageUsedDetailed}
            aiMinutesUsed={aiMinutesUsed}
            onUpgrade={() => setShowPlansModal(true)}
            onViewDetails={() => router.push('/settings')}
          />
        </div>

        {/* 오른쪽: 최근 강의 */}
        <div className="lg:col-span-2">
          <RecentRecordings
            recordings={recordings}
            subjects={subjects}
            onPlayRecording={handlePlayRecording}
            onViewAll={() => router.push('/subjects')}
          />
        </div>
      </div>

      {/* 학습 팁 카드 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">💡 학습 팁</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                더 효과적인 학습을 위한 Rozeta 활용법을 알아보세요.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">AI 설명 기능으로 복습 효과 극대화</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300">클라우드 저장으로 언제 어디서나 접근</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-gray-700 dark:text-gray-300">과목별 체계적인 학습 관리</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 구독 플랜 모달 */}
      <SubscriptionPlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        plans={plans}
        currentPlanId={subscription?.plan_id}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  )
}