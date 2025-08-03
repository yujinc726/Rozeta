'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, Brain, Download, ArrowLeft } from 'lucide-react'

interface SlideData {
  slideNumber: number
  thumbnail: string
  startTime: string
  transcript: string
  summary: string
  keywords: string[]
  questions: string[]
}

interface ResultViewProps {
  subjectName: string
  recordingTitle: string
  pdfUrl?: string
  audioUrl?: string
  slides: SlideData[]
  onBack: () => void
}

export default function ResultView({ 
  subjectName, 
  recordingTitle, 
  slides, 
  onBack 
}: ResultViewProps) {
  const [selectedSlide, setSelectedSlide] = useState(0)
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={onBack}
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{recordingTitle}</h1>
              <p className="text-sm text-gray-600">{subjectName}</p>
            </div>
          </div>
          
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Download className="w-4 h-4 mr-2" />
            노트 다운로드
          </Button>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Slide Thumbnails */}
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">슬라이드 목록</h2>
            <p className="text-sm text-gray-600 mt-1">총 {slides.length}개</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSlide(index)}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedSlide === index 
                      ? 'border-purple-500 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="bg-gray-100 p-2">
                    <img 
                      src={slide.thumbnail} 
                      alt={`슬라이드 ${slide.slideNumber}`}
                      className="w-full h-32 object-contain"
                    />
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-sm font-medium">슬라이드 {slide.slideNumber}</p>
                    <p className="text-xs text-gray-500">{slide.startTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Transcript */}
        <div className="flex-1 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">전체 스크립트</h2>
            <p className="text-sm text-gray-600 mt-1">AI가 변환한 음성 텍스트</p>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="prose prose-sm max-w-none">
              {slides.map((slide, index) => (
                <div 
                  key={index}
                  className={`mb-6 pb-6 border-b border-gray-200 ${
                    selectedSlide === index ? 'bg-purple-50 -mx-6 px-6 py-4 rounded-lg' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">슬라이드 {slide.slideNumber}</Badge>
                    <span className="text-sm text-gray-500">{slide.startTime}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{slide.transcript}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - AI Summary */}
        <div className="w-96 bg-gray-50">
          <div className="p-4 bg-white border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI 학습 노트
            </h2>
            <p className="text-sm text-gray-600 mt-1">슬라이드 {slides[selectedSlide]?.slideNumber}</p>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">핵심 요약</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {slides[selectedSlide]?.summary || '요약 정보가 없습니다.'}
                  </p>
                </CardContent>
              </Card>

              {/* Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">주요 키워드</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {slides[selectedSlide]?.keywords.map((keyword, i) => (
                      <Badge 
                        key={i} 
                        className="bg-purple-100 text-purple-700 border-purple-200"
                      >
                        {keyword}
                      </Badge>
                    )) || <p className="text-sm text-gray-500">키워드가 없습니다.</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Expected Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">예상 문제</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {slides[selectedSlide]?.questions.map((question, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-purple-600 font-semibold">Q{i + 1}.</span>
                        <p className="text-sm text-gray-700">{question}</p>
                      </div>
                    )) || <p className="text-sm text-gray-500">예상 문제가 없습니다.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
} 