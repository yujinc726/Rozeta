"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Sparkles, 
  TrendingUp,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Recording, Subject } from '@/lib/supabase'

interface DashboardStatsProps {
  subjects: Subject[]
  recordings: Recording[]
}

export default function DashboardStats({
  subjects,
  recordings
}: DashboardStatsProps) {
  // 통계 계산
  const totalRecordings = recordings.length
  const totalStudyTime = Math.floor(recordings.reduce((acc, r) => acc + (r.duration || 0), 0) / 3600)
  const aiAnalyzedCount = recordings.filter(r => r.ai_analyzed_at).length
  const processingCount = recordings.filter(r => r.subtitles && !r.ai_analyzed_at).length

  const stats = [
    {
      title: '등록된 과목',
      value: subjects.length,
      unit: '개',
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-100',
      description: '현재 학습 중인 과목 수'
    },
    {
      title: '총 녹음',
      value: totalRecordings,
      unit: '개',
      icon: Clock,
      color: 'text-green-600 bg-green-100',
      description: '지금까지 녹음한 강의 수'
    },
    {
      title: '학습 시간',
      value: totalStudyTime,
      unit: '시간',
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
      description: '총 누적 학습 시간'
    },
    {
      title: 'AI 분석 완료',
      value: aiAnalyzedCount,
      unit: '개',
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-100',
      description: 'AI 강의 설명이 완료된 녹음'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </span>
                    <span className="text-sm text-gray-500">
                      {stat.unit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}