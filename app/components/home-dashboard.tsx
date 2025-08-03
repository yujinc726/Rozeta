"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  FileAudio, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  Mic,
  FileText,
  Sparkles,
  ArrowRight,
  Play
} from "lucide-react"

interface HomeDashboardProps {
  userName?: string
  totalSubjects: number
  totalRecordings: number
  totalStudyTime: string
  recentActivities: {
    id: string
    type: 'recording' | 'study'
    subjectName: string
    title: string
    date: string
    duration?: string
  }[]
  weeklyProgress: {
    day: string
    minutes: number
  }[]
  onStartRecording?: () => void
  onViewRecentNote?: () => void
  onViewAIAnalysis?: () => void
}

export default function HomeDashboard({
  userName = "사용자",
  totalSubjects = 0,
  totalRecordings = 0,
  totalStudyTime = "0시간",
  recentActivities = [],
  weeklyProgress = [],
  onStartRecording,
  onViewRecentNote,
  onViewAIAnalysis
}: HomeDashboardProps) {
  const maxMinutes = Math.max(...weeklyProgress.map(d => d.minutes), 60)

  return (
    <div className="flex-1 p-8 overflow-auto bg-gray-50">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          안녕하세요, {userName}님! 👋
        </h1>
        <p className="text-gray-600">
                          오늘도 Rozeta와 함께 효율적인 학습을 시작해보세요.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card 
          onClick={onStartRecording}
          className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-gradient-to-br from-purple-500 to-pink-500 text-white"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Mic className="w-8 h-8" />
              <ArrowRight className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold text-lg mb-1">새 녹음 시작</h3>
            <p className="text-sm opacity-90">강의를 녹음하고 스마트 노트를 만들어보세요</p>
          </CardContent>
        </Card>

        <Card 
          onClick={onViewRecentNote}
          className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileText className="w-8 h-8 text-purple-600" />
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold text-lg mb-1">최근 노트 보기</h3>
            <p className="text-sm text-gray-600">마지막으로 작성한 노트를 확인하세요</p>
          </CardContent>
        </Card>

        <Card 
          onClick={onViewAIAnalysis}
          className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Sparkles className="w-8 h-8 text-purple-600" />
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold text-lg mb-1">AI 분석 보기</h3>
            <p className="text-sm text-gray-600">AI가 생성한 요약과 핵심 포인트를 확인하세요</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>전체 과목</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{totalSubjects}</p>
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>총 녹음</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{totalRecordings}</p>
              <FileAudio className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>총 학습 시간</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{totalStudyTime}</p>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>이번 주 학습</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">+15%</p>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              최근 활동
            </CardTitle>
            <CardDescription>최근 학습 기록을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      activity.type === 'recording' ? "bg-purple-100" : "bg-blue-100"
                    )}>
                      {activity.type === 'recording' ? (
                        <Mic className="w-5 h-5 text-purple-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.subjectName} • {activity.date}</p>
                    </div>
                  </div>
                  {activity.duration && (
                    <Badge variant="secondary">{activity.duration}</Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>아직 활동 기록이 없습니다</p>
                <p className="text-sm mt-1">첫 번째 녹음을 시작해보세요!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              주간 학습 통계
            </CardTitle>
            <CardDescription>이번 주 학습 시간을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyProgress.map((day) => (
                <div key={day.day} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{day.day}</span>
                    <span className="font-medium">{day.minutes}분</span>
                  </div>
                  <Progress 
                    value={(day.minutes / maxMinutes) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">주간 총 학습 시간</span>
                <span className="font-semibold text-lg">
                  {Math.floor(weeklyProgress.reduce((acc, d) => acc + d.minutes, 0) / 60)}시간 {weeklyProgress.reduce((acc, d) => acc + d.minutes, 0) % 60}분
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="border-0 shadow-lg mt-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            학습 팁
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-purple-600">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">녹음 전 PDF 업로드</p>
                <p className="text-xs text-gray-600 mt-1">강의 자료를 미리 업로드하면 슬라이드 동기화가 더 정확해집니다</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-purple-600">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">슬라이드 전환 시 메모</p>
                <p className="text-xs text-gray-600 mt-1">중요한 내용은 슬라이드별 메모로 남겨두세요</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-purple-600">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">AI 분석 활용</p>
                <p className="text-xs text-gray-600 mt-1">AI가 생성한 요약과 핵심 용어로 효율적으로 복습하세요</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: (string | undefined | boolean)[]) {
  return inputs.filter(Boolean).join(' ')
} 