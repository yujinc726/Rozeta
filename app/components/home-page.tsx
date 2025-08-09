"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileAudio, Mic, Zap, BookOpen, Brain, ArrowRight, Play, FileText, Clock, Target, Sparkles, CheckCircle2, Users } from "lucide-react"
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-shape shape-1 absolute w-32 md:w-64 h-32 md:h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
        <div className="floating-shape shape-2 absolute w-48 md:w-96 h-48 md:h-96 bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full blur-2xl"></div>
        <div className="floating-shape shape-3 absolute w-24 md:w-48 h-24 md:h-48 bg-gradient-to-br from-pink-400/25 to-orange-400/25 rounded-full blur-lg"></div>
        <div className="floating-shape shape-4 absolute w-16 md:w-32 h-16 md:h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-md"></div>
        <div className="floating-shape shape-5 absolute w-40 md:w-80 h-40 md:h-80 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-4 md:p-6 lg:px-8">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-bold">
            <span style={{ 
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Rozeta
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs md:text-sm px-2 md:px-3">
            Beta
          </Badge>
              {user ? (
                <div className="flex items-center gap-2">
                  {!isMobile && <span className="text-sm text-gray-600">{user.email}</span>}
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
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-12 md:pt-20 pb-20 md:pb-32">
        <AnimatedSection className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-full px-4 py-2 mb-8 shadow-sm">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI가 강의를 완벽하게 정리해드립니다</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 md:mb-8 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              강의 녹음
            </span>
            <span className="text-gray-900">을</span>
            <br />
            <span className="text-gray-900">스마트 노트로</span>
          </h1>

          <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2 md:px-0">
            슬라이드와 음성을 실시간으로 동기화하고, AI가 핵심 내용을 자동으로 정리합니다.
            <br />
            시험 대비에 최적화된 요약과 예상 문제까지 제공합니다.
          </p>

            <Button
            size="lg"
              onClick={onGetStarted}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Mic className="w-5 h-5 mr-2" />
            {user ? '시작하기' : '무료로 시작하기'}
            </Button>
        </AnimatedSection>

        {/* Problem Section */}
        <AnimatedSection className="mt-20 md:mt-32 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8 text-gray-900 px-2">
            강의 녹음, <span className="text-purple-600">이런 경험</span> 있으신가요?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            <Card className="border-2 border-gray-200 bg-gray-50/50">
              <CardContent className="p-6">
                <Clock className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-gray-700">방대한 녹음 파일을<br />다시 듣기 부담스러워요</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 bg-gray-50/50">
              <CardContent className="p-6">
                <FileText className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-gray-700">어느 부분이 어떤 슬라이드<br />내용인지 찾기 어려워요</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 bg-gray-50/50">
              <CardContent className="p-6">
                <Target className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-gray-700">결국 제대로 활용 못하고<br />시험 기간에 후회해요</p>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>

        {/* Solution Cards */}
        <AnimatedSection className="mt-20 md:mt-32">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 text-gray-900 px-2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Rozeta</span>가 해결해드립니다
          </h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <AnimatedSection>
              <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
                <CardContent className="relative p-6 md:p-8">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg">
                    <Mic className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-gray-900">쉬운 녹음</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                    버튼 하나로 강의 녹음 시작<br />
                    슬라이드 넘길 때 클릭만 하세요
              </p>
            </CardContent>
          </Card>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                <CardContent className="relative p-6 md:p-8">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg">
                    <Brain className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-gray-900">AI 자동 정리</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                    녹음이 끝나면 AI가 알아서<br />
                    텍스트 변환부터 요약까지 완료
              </p>
            </CardContent>
          </Card>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-orange-500/10"></div>
                <CardContent className="relative p-6 md:p-8">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg">
                    <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-gray-900">완벽한 노트</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                    슬라이드별 핵심 요약과<br />
                    예상 문제까지 한 번에 확인
              </p>
            </CardContent>
          </Card>
            </AnimatedSection>
        </StaggerContainer>
          </AnimatedSection>

        {/* How It Works */}
        <AnimatedSection className="mt-20 md:mt-32">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 text-gray-900 px-2">
            이렇게 <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">간단</span>합니다
          </h2>

          <StaggerContainer className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 md:gap-8 bg-white/80 backdrop-blur-sm rounded-2xl p-4 md:p-8 shadow-lg">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-purple-600">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-gray-900">강의 시작 전, PDF 업로드</h3>
                <p className="text-sm md:text-base text-gray-600">과목을 선택하고 강의 자료(PDF)를 업로드한 후 녹음을 시작하세요</p>
              </div>
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-purple-300" />
            </div>

            <div className="flex items-center gap-4 md:gap-8 bg-white/80 backdrop-blur-sm rounded-2xl p-4 md:p-8 shadow-lg">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-purple-600">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-gray-900">강의 중, 슬라이드 동기화</h3>
                <p className="text-sm md:text-base text-gray-600">교수님이 슬라이드를 넘길 때마다 '다음 슬라이드' 버튼만 클릭</p>
              </div>
              <ArrowRight className="w-10 h-10 md:w-12 md:h-12 text-purple-300" />
            </div>

            <div className="flex items-center gap-4 md:gap-8 bg-white/80 backdrop-blur-sm rounded-2xl p-4 md:p-8 shadow-lg">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-purple-600">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-gray-900">강의 후, 자동 생성된 노트 확인</h3>
                <p className="text-sm md:text-base text-gray-600">AI가 슬라이드별 요약, 핵심 키워드, 예상 문제를 자동으로 정리</p>
              </div>
              <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-purple-300" />
            </div>
          </StaggerContainer>
        </AnimatedSection>

        {/* Features Section */}
        <AnimatedSection className="mt-20 md:mt-32">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 text-gray-900 px-2">
            시험 준비가 <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">이렇게 쉬워집니다</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-gray-900">과목별 체계적 관리</h3>
                    <p className="text-sm md:text-base text-gray-600">모든 녹음과 노트를 과목별로 정리하여 한눈에 확인하고 쉽게 찾아볼 수 있습니다</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-gray-900">핵심만 쏙쏙 정리</h3>
                    <p className="text-sm md:text-base text-gray-600">방대한 강의 내용 중 중요한 부분만 AI가 추출하여 시험 대비 시간을 대폭 단축</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-gray-900">예상 문제로 실전 대비</h3>
                    <p className="text-sm md:text-base text-gray-600">각 슬라이드의 내용을 바탕으로 AI가 생성한 예상 문제로 미리 시험을 준비하세요</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-gray-900">언제 어디서나 복습</h3>
                    <p className="text-sm md:text-base text-gray-600">클라우드에 저장되어 PC, 태블릿, 스마트폰 어디서든 학습 가능</p>
        </div>
      </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>

        {/* Testimonial Section */}
        <AnimatedSection className="mt-20 md:mt-32">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 text-gray-900 px-2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">대학생들이 인정한</span> 강의 노트 서비스
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">컴퓨터공학과 3학년</span>
                </div>
                <p className="text-gray-600 italic">"전공 수업 때마다 사용하고 있어요. 특히 예상 문제가 실제 시험에 많이 나와서 놀랐습니다!"</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">경영학과 2학년</span>
                </div>
                <p className="text-gray-600 italic">"녹음만 해두면 AI가 알아서 정리해주니 수업에 더 집중할 수 있게 되었어요."</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">의예과 1학년</span>
                </div>
                <p className="text-gray-600 italic">"방대한 의학 용어도 정확히 인식하고, 슬라이드별로 정리되어 복습이 정말 편해요."</p>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>

      {/* CTA Section */}
        <AnimatedSection className="mt-20 md:mt-32 mb-12 md:mb-16">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl"></div>
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            
            {/* Content */}
            <div className="relative bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-16 text-center border border-purple-100">
              <div className="max-w-4xl mx-auto">
                {/* Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                
                {/* Heading */}
                <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 text-gray-900">
                  강의 노트, 이제 AI가 만들어드립니다
                </h2>
                
                {/* Subheading */}
                <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed">
                  매 학기 수백 시간의 강의를 완벽하게 기록하고 정리하세요.
                  <br />
                  Rozeta가 여러분의 학습 파트너가 되어드립니다.
                </p>
                
                {/* CTA Button */}
                {user ? (
        <Button
                    size="lg" 
          onClick={onGetStarted}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 md:px-10 py-4 md:py-6 text-base md:text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <ArrowRight className="w-6 h-6 mr-2" />
                    대시보드로 이동
                  </Button>
                ) : (
                  <div className="space-y-6">
                    <Button 
          size="lg"
                      onClick={onGetStarted}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 md:px-10 py-4 md:py-6 text-base md:text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
                      <Sparkles className="w-6 h-6 mr-2" />
                      지금 시작하기
        </Button>
                    <p className="text-gray-500 text-sm">
                      가입 후 바로 사용 가능
                    </p>
                  </div>
                )}
                
                {/* Features */}
                <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    <span>AI 자동 요약</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    <span>예상 문제 생성</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    <span>슬라이드별 정리</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
