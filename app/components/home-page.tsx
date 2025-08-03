"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileAudio, Mic, Zap, BookOpen, Brain, ArrowRight, Play } from "lucide-react"
import { AnimatedSection } from "./animated-section"
import { StaggerContainer } from "./stagger-container"
import { auth } from "@/lib/supabase"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

interface HomePageProps {
  onGetStarted: () => void
}

export default function HomePage({ onGetStarted }: HomePageProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    auth.getUser().then(u => setUser(u))
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-shape shape-1 absolute w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
        <div className="floating-shape shape-2 absolute w-96 h-96 bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full blur-2xl"></div>
        <div className="floating-shape shape-3 absolute w-48 h-48 bg-gradient-to-br from-pink-400/25 to-orange-400/25 rounded-full blur-lg"></div>
        <div className="floating-shape shape-4 absolute w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-md"></div>
        <div className="floating-shape shape-5 absolute w-80 h-80 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <FileAudio className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Rozeta
          </span>
        </div>
        <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                Beta
              </Badge>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <Button 
                    variant="ghost" 
                    className="text-gray-600 hover:text-gray-900"
                    onClick={async () => {
                      await auth.signOut()
                      window.location.reload()
                    }}
                  >
                    로그아웃
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-gray-600 hover:text-gray-900"
                  onClick={onGetStarted}
                >
                  로그인
                </Button>
              )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-32">
        <AnimatedSection className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-full px-4 py-2 mb-8 shadow-sm">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI가 강의를 완벽하게 정리해드립니다</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              강의 녹음
            </span>
            <span className="text-gray-900">을</span>
            <br />
            <span className="text-gray-900">스마트 노트로</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            슬라이드와 음성을 실시간으로 동기화하고, AI가 핵심 내용을 자동으로 정리합니다.
            <br />
            시험 대비에 최적화된 요약과 예상 문제까지 제공합니다.
          </p>

                      <StaggerContainer className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Mic className="w-5 h-5 mr-2" />
                {user ? '시작하기' : '무료로 시작하기'}
              </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-gray-300 hover:border-purple-400 text-gray-700 hover:text-purple-700 px-8 py-6 text-lg rounded-full transition-all duration-300"
            >
              <Play className="w-5 h-5 mr-2" />
              데모 영상 보기
            </Button>
          </StaggerContainer>
        </AnimatedSection>

        {/* Feature Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          <AnimatedSection>
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
              <CardContent className="relative p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">실시간 동기화</h3>
                <p className="text-gray-600 leading-relaxed">
                  강의 중 슬라이드가 바뀔 때마다 클릭 한 번으로 정확한 타임스탬프 기록
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection>
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
              <CardContent className="relative p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">AI 자동 분석</h3>
                <p className="text-gray-600 leading-relaxed">
                  Whisper AI로 정확한 전사, GPT-4로 핵심 내용과 예상 문제 자동 생성
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection>
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-orange-500/10"></div>
              <CardContent className="relative p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">스마트 노트</h3>
                <p className="text-gray-600 leading-relaxed">
                  슬라이드별 요약, 핵심 용어, 예상 문제를 한눈에 볼 수 있는 3단 뷰
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </StaggerContainer>

        {/* How It Works */}
        <AnimatedSection className="mt-32">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            간단한 <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">3단계</span>로 시작하세요
          </h2>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">PDF 업로드</h3>
              <p className="text-gray-600">강의 자료를 업로드하고 녹음을 시작하세요</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">실시간 동기화</h3>
              <p className="text-gray-600">슬라이드가 바뀔 때마다 버튼을 클릭하세요</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">AI 노트 확인</h3>
              <p className="text-gray-600">자동 생성된 스마트 노트로 효율적인 학습</p>
            </div>
          </StaggerContainer>
        </AnimatedSection>

        {/* CTA Section */}
        <AnimatedSection className="mt-32">
          <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-white/10"></div>
            <CardContent className="relative p-12 text-center text-white">
              <h2 className="text-4xl font-bold mb-4">지금 바로 시작하세요</h2>
              <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                더 이상 강의 내용을 놓치지 마세요. AI가 모든 것을 기록하고 정리해드립니다.
              </p>
              {user ? (
                <Button 
                  size="lg" 
                  onClick={onGetStarted}
                  className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg rounded-full shadow-lg"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  대시보드로 이동
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={onGetStarted}
                  className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg rounded-full shadow-lg"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  무료로 체험하기
                </Button>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>

      {/* CSS for floating shapes animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(90deg);
          }
          50% {
            transform: translateY(0) rotate(180deg);
          }
          75% {
            transform: translateY(20px) rotate(270deg);
          }
        }

        .floating-shape {
          animation: float 20s ease-in-out infinite;
        }

        .shape-1 {
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          top: 60%;
          right: 10%;
          animation-delay: 5s;
        }

        .shape-3 {
          bottom: 20%;
          left: 20%;
          animation-delay: 10s;
        }

        .shape-4 {
          top: 40%;
          right: 30%;
          animation-delay: 15s;
        }

        .shape-5 {
          bottom: 10%;
          right: 40%;
          animation-delay: 2.5s;
        }
      `}</style>
    </div>
  )
}
