"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Star, Zap, Shield, Infinity } from 'lucide-react'
import { SubscriptionPlan } from '@/lib/supabase'

interface SubscriptionPlansModalProps {
  isOpen: boolean
  onClose: () => void
  plans: SubscriptionPlan[]
  currentPlanId?: string
  onSelectPlan?: (plan: SubscriptionPlan) => void
}

export default function SubscriptionPlansModal({
  isOpen,
  onClose,
  plans,
  currentPlanId,
  onSelectPlan
}: SubscriptionPlansModalProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <Zap className="h-6 w-6" />
      case 'standard':
        return <Star className="h-6 w-6" />
      case 'premium':
        return <Shield className="h-6 w-6" />
      default:
        return <Star className="h-6 w-6" />
    }
  }

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return 'border-gray-200 bg-gray-50/50'
      case 'standard':
        return 'border-blue-200 bg-blue-50/30'
      case 'premium':
        return 'border-purple-300 bg-purple-50/30 shadow-lg'
      default:
        return 'border-gray-200'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">구독 플랜 선택</DialogTitle>
          <DialogDescription className="text-center">
            학습 스타일에 맞는 플랜을 선택하세요
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId
            const isPremium = plan.name.toLowerCase() === 'premium'
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all hover:scale-105 ${getPlanColor(plan.name)} ${
                  isPremium ? 'md:-mt-4 md:mb-4' : ''
                }`}
              >
                {isPremium && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white px-3 py-1">
                      가장 인기
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-3">
                    <div className={`p-3 rounded-full ${
                      plan.name.toLowerCase() === 'premium' 
                        ? 'bg-purple-100 text-purple-600' 
                        : plan.name.toLowerCase() === 'standard'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getPlanIcon(plan.name)}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{plan.display_name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{formatPrice(plan.price_krw)}</span>
                    <span className="text-gray-600 ml-2">/월</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 주요 리소스 */}
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">저장 공간</span>
                      <span className="font-semibold">{plan.storage_gb}GB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">AI 변환</span>
                      <span className="font-semibold">
                        {plan.ai_minutes_per_month ? (
                          `${plan.ai_minutes_per_month}분/월`
                        ) : (
                          <span className="flex items-center gap-1">
                            <Infinity className="h-4 w-4" />
                            무제한
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 기능 목록 */}
                  <div className="space-y-2">
                    {plan.features?.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="pt-4">
                    {isCurrentPlan ? (
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        disabled
                      >
                        현재 플랜
                      </Button>
                    ) : (
                      <Button 
                        className={`w-full ${
                          isPremium 
                            ? 'text-white hover:opacity-90 transition-opacity' 
                            : ''
                        }`}
                        style={isPremium ? {
                          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                        } : undefined}
                        variant={isPremium ? 'default' : 'outline'}
                        onClick={() => {
                          onSelectPlan?.(plan)
                          onClose()
                        }}
                      >
                        {plan.price_krw === 0 ? '무료로 시작' : '플랜 선택'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 추가 정보 */}
        <div className="text-center space-y-2 pt-6 border-t">
          <p className="text-sm text-gray-600">
            모든 플랜은 언제든지 변경하거나 취소할 수 있습니다
          </p>
          <p className="text-sm text-gray-600">
            VAT 포함 가격 • 카드 결제 가능
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}