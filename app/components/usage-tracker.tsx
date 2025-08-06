"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  HardDrive, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { UserSubscription } from '@/lib/supabase'

interface UsageTrackerProps {
  subscription: UserSubscription | null
  storageUsed: number // in bytes
  aiMinutesUsed: number
  onUpgrade?: () => void
  onViewDetails?: () => void
}

export default function UsageTracker({
  subscription,
  storageUsed,
  aiMinutesUsed,
  onUpgrade,
  onViewDetails
}: UsageTrackerProps) {
  // 무료 플랜 기본값
  const defaultPlan = {
    storage_gb: 1,
    ai_minutes_per_month: 60,
    display_name: 'Free'
  }

  const plan = subscription?.plan || defaultPlan
  const storageLimit = (plan.storage_gb || defaultPlan.storage_gb) * 1024 * 1024 * 1024 // GB to bytes
  const aiMinutesLimit = plan.ai_minutes_per_month || defaultPlan.ai_minutes_per_month

  // 사용률 계산
  const storagePercent = Math.min((storageUsed / storageLimit) * 100, 100)
  const aiMinutesPercent = aiMinutesLimit ? Math.min((aiMinutesUsed / aiMinutesLimit) * 100, 100) : 0

  // GB 단위로 변환
  const storageUsedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2)
  const storageLimitGB = plan.storage_gb || defaultPlan.storage_gb

  // 상태에 따른 색상 결정
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getTextColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600'
    if (percent >= 70) return 'text-orange-600'
    return 'text-green-600'
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">사용량 현황</CardTitle>
            <Badge variant={subscription ? 'default' : 'secondary'}>
              {plan.display_name}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 저장 공간 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-gray-600" />
              <span className="font-medium">저장 공간</span>
            </div>
            <span className={`text-sm font-semibold ${getTextColor(storagePercent)}`}>
              {storageUsedGB}GB / {storageLimitGB}GB
            </span>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={storagePercent} 
              className="h-3"
              indicatorClassName={getProgressColor(storagePercent)}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{storagePercent.toFixed(1)}% 사용 중</span>
              <span>{(storageLimitGB - parseFloat(storageUsedGB)).toFixed(2)}GB 남음</span>
            </div>
          </div>

          {storagePercent >= 90 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-xs text-red-600">
                저장 공간이 거의 가득 찼습니다. 플랜을 업그레이드하거나 파일을 정리하세요.
              </span>
            </div>
          )}
        </div>

        {/* AI 변환 시간 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="font-medium">AI 변환 시간</span>
            </div>
            <span className={`text-sm font-semibold ${
              aiMinutesLimit ? getTextColor(aiMinutesPercent) : 'text-purple-600'
            }`}>
              {aiMinutesLimit 
                ? `${aiMinutesUsed}분 / ${aiMinutesLimit}분`
                : `${aiMinutesUsed}분 (무제한)`
              }
            </span>
          </div>
          
          {aiMinutesLimit && (
            <>
              <div className="space-y-2">
                <Progress 
                  value={aiMinutesPercent} 
                  className="h-3"
                  indicatorClassName={getProgressColor(aiMinutesPercent)}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{aiMinutesPercent.toFixed(1)}% 사용 중</span>
                  <span>{aiMinutesLimit - aiMinutesUsed}분 남음</span>
                </div>
              </div>

              {aiMinutesPercent >= 90 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-xs text-red-600">
                    이번 달 AI 변환 시간이 거의 소진되었습니다.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 상세 정보 링크 */}
        {onViewDetails && (
          <div className="pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-between hover:bg-gray-50"
              onClick={onViewDetails}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                사용량 상세 분석
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 업그레이드 버튼 */}
        {onUpgrade && (!subscription || subscription.plan?.name === 'free') && (
          <div className="pt-2 border-t">
            <Button 
              size="sm"
              className="w-full text-white hover:opacity-90 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
              }}
              onClick={onUpgrade}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              플랜 업그레이드
            </Button>
          </div>
        )}

        {/* 리셋 날짜 */}
        {subscription && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            다음 리셋: {new Date(subscription.billing_cycle_end).toLocaleDateString('ko-KR')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}