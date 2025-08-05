"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Brain, Sparkles, Link, Target, BookOpen, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface AIExplanation {
  summary: string
  detailed: string
  key_points: string[]
  connections: {
    previous: string
    next: string
  }
  exam_points: string[]
  examples: string[]
  study_tips: string
}

interface SlideAIExplanationProps {
  explanation: AIExplanation | null
  slideNumber: number
  isGenerating?: boolean
  generatedAt?: string
  onRegenerate?: () => void
}

export function SlideAIExplanation({ 
  explanation, 
  slideNumber,
  isGenerating = false,
  generatedAt,
  onRegenerate 
}: SlideAIExplanationProps) {
  const [activeTab, setActiveTab] = useState("summary")

  if (isGenerating) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            AI 강의 설명 생성 중...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">
              Gemini 2.5 Pro가 슬라이드 {slideNumber}를 분석하고 있습니다...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!explanation) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-gray-400" />
            AI 강의 설명
          </CardTitle>
          <CardDescription>
            아직 AI 설명이 생성되지 않았습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">
              상단의 "AI 설명 보기" 버튼을 클릭하여 AI 분석을 시작하세요
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI 강의 설명
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Gemini 2.5 Pro
              </Badge>
              {generatedAt && (
                <span className="text-xs text-gray-500">
                  {new Date(generatedAt).toLocaleString('ko-KR')}
                </span>
              )}
            </CardDescription>
          </div>
          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              size="sm"
              variant="ghost"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              재생성
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="summary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              핵심 요약
            </TabsTrigger>
            <TabsTrigger value="detailed" className="gap-1">
              <BookOpen className="w-3 h-3" />
              상세 설명
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1">
              <Link className="w-3 h-3" />
              연결 학습
            </TabsTrigger>
            <TabsTrigger value="exam" className="gap-1">
              <Target className="w-3 h-3" />
              시험 대비
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="p-4 bg-white rounded-lg border border-purple-100">
              <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {explanation.summary || "요약 내용이 없습니다."}
              </p>
            </div>
            
            {explanation.key_points && explanation.key_points.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">핵심 포인트</h4>
                <ul className="space-y-2">
                  {explanation.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span className="text-sm text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {(!explanation.key_points || explanation.key_points.length === 0) && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  핵심 포인트가 없습니다.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="detailed" className="mt-4">
            <div className="p-4 bg-white rounded-lg border border-purple-100">
              <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {explanation.detailed || "상세 설명이 없습니다."}
              </p>
            </div>
            
            {explanation.examples && explanation.examples.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">예시 및 응용</h4>
                <div className="space-y-2">
                  {explanation.examples.map((example, index) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-700">{example}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!explanation.examples || explanation.examples.length === 0) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  예시 및 응용 사례가 없습니다.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="mt-4 space-y-4">
            {explanation.connections?.previous && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  ← 이전 슬라이드와의 연결
                </h4>
                <p className="text-sm text-gray-700">
                  {explanation.connections.previous}
                </p>
              </div>
            )}
            
            {explanation.connections?.next && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-semibold text-green-800 mb-2">
                  다음 슬라이드로의 전개 →
                </h4>
                <p className="text-sm text-gray-700">
                  {explanation.connections.next}
                </p>
              </div>
            )}
            
            {!explanation.connections?.previous && !explanation.connections?.next && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  연결 정보가 없습니다.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="exam" className="mt-4 space-y-4">
            {explanation.exam_points && explanation.exam_points.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  시험 출제 예상 포인트
                </h4>
                <div className="space-y-2">
                  {explanation.exam_points.map((point, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <p className="text-sm text-gray-700">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {explanation.study_tips && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">
                  학습 팁
                </h4>
                <p className="text-sm text-gray-700">
                  {explanation.study_tips || "학습 팁이 없습니다."}
                </p>
              </div>
            )}
            
            {(!explanation.exam_points || explanation.exam_points.length === 0) && !explanation.study_tips && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  시험 관련 정보가 없습니다.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}