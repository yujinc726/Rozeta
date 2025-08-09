'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Wand2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAIAnalysis } from "@/app/contexts/ai-analysis-context"
import { useIsMobile } from "@/hooks/use-mobile"

interface AIAnalysisModalProps {
  recordingId: string
  recordingTitle: string
  hasSlides: boolean
  hasTranscript: boolean
  isRegenerate?: boolean
  onBack: () => void
}

export default function AIAnalysisModal({ 
  recordingId, 
  recordingTitle,
  hasSlides,
  hasTranscript,
  isRegenerate = false,
  onBack 
}: AIAnalysisModalProps) {
  const isMobile = useIsMobile()
  const [customPrompt, setCustomPrompt] = useState("")
  const { startAnalysis } = useAIAnalysis()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartAnalysis = async () => {
    if (!hasTranscript) {
      toast.error("먼저 AI 자막을 생성해주세요.")
      return
    }

    setIsStarting(true)
    
    // 백그라운드 작업을 시작하고 즉시 모달 닫기
    startAnalysis(recordingId, {
      prompt: customPrompt,
      regenerate: isRegenerate
    }).catch(error => {
      console.error('Failed to start AI analysis:', error)
      toast.error('AI 분석 시작에 실패했습니다.')
    })
    
    // 즉시 모달 닫고 알림 표시
    toast.info('AI 분석이 시작되었습니다. 백그라운드에서 진행됩니다.')
    if (onBack) {
      onBack()
    }
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b p-4">
        <div className={`${isMobile ? '' : 'max-w-4xl'} mx-auto flex items-center justify-between`}>
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold flex items-center gap-2`}>
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className={isMobile ? 'truncate' : ''}>
                  {isRegenerate ? 'AI 강의 분석 재생성' : 'AI 강의 분석'}
                </span>
              </h1>
              <p className="text-sm text-gray-500 truncate">{recordingTitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`${isMobile ? 'p-4' : 'p-8 max-w-4xl'} mx-auto space-y-6`}>
        {/* Custom Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>추가 요청사항 (선택)</CardTitle>
            <CardDescription>
              AI에게 특별히 요청하고 싶은 사항이 있다면 입력해주세요.
              입력하지 않으면 기본 분석이 진행됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">프롬프트</Label>
              <Textarea
                id="prompt"
                placeholder="예: 수학 공식 위주로 정리해주세요, 시험에 나올만한 내용 위주로 요약해주세요, 실무에 어떻게 적용되는지 설명해주세요..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              
              {/* 빠른 프롬프트 버튼들 */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomPrompt("수학 공식과 계산 과정을 중심으로 설명해주세요")}
                >
                  수학 공식 중심
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomPrompt("시험에 출제될 가능성이 높은 내용 위주로 정리해주세요")}
                >
                  시험 대비
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomPrompt("실무에서 어떻게 활용되는지 실제 사례와 함께 설명해주세요")}
                >
                  실무 적용
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomPrompt("초보자도 이해하기 쉽게 기초부터 단계별로 설명해주세요")}
                >
                  기초 설명
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">기본 분석 내용</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 강의 전체 요약</li>
                <li>• 각 슬라이드별 핵심 내용 정리</li>
                <li>• 중요 개념 및 용어 설명</li>
                <li>• 학습 포인트 정리</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleStartAnalysis}
              disabled={!hasTranscript || isStarting}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
              size="lg"
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  시작하는 중...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  {isRegenerate ? 'AI 분석 다시 시작' : 'AI 분석 시작'}
                </>
              )}
            </Button>

            {!hasTranscript && (
              <p className="text-sm text-red-500 text-center mt-2">
                먼저 AI 자막 · 텍스트 생성을 완료해주세요.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
