"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, Wand2, Download, FileAudio, X, Database } from "lucide-react"
import { toast } from "sonner"
import { recordings } from "@/lib/database"
import { useWhisper } from "@/app/contexts/whisper-context"
import { useIsMobile } from "@/hooks/use-mobile"

interface WhisperProcessorProps {
  recordingId?: string
  audioUrl?: string
  isRegenerate?: boolean
  onBack?: () => void
}

export default function WhisperProcessor({ recordingId, audioUrl, isRegenerate = false, onBack }: WhisperProcessorProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [stableTs, setStableTs] = useState(true)
  const [removeRepeated, setRemoveRepeated] = useState(true)
  const [merge, setMerge] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rawSubtitles, setRawSubtitles] = useState("")
  const [arrangedSubtitles, setArrangedSubtitles] = useState("")
  
  const { startTranscription } = useWhisper()
  const [isStarting, setIsStarting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Load audio from URL if provided
  useEffect(() => {
    if (audioUrl) {
      fetch(audioUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
          setSelectedFile(file)
          toast.success('녹음 파일이 로드되었습니다.')
        })
        .catch(err => {
          console.error('Failed to load audio:', err)
          toast.error('오디오 파일을 로드할 수 없습니다.')
        })
    }
  }, [audioUrl])

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        if (onBack) {
          onBack();
        } else {
          router.back();
        }
      }, 1500); // 1.5초 후에 실행
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onBack, router]);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type.includes('audio') || file.type.includes('video'))) {
      setSelectedFile(file)
      toast.success(`${file.name} 파일이 선택되었습니다.`)
    } else if (file) {
      toast.error('오디오 또는 비디오 파일만 업로드 가능합니다.')
    }
  }



  const processAudio = async () => {
    // Reset states for re-processing
    setIsSuccess(false);
    setProgress(0);
    setRawSubtitles("");
    setArrangedSubtitles("");

    if (!selectedFile) {
      toast.error('오디오 파일을 선택해주세요.')
      return
    }

    setIsProcessing(true)
    setProgress(10)
    
    try {
      toast.info('파일을 서버로 전송하는 중...')
      const formData = new FormData()
      formData.append('audio', selectedFile)
      formData.append('prompt', prompt)
      // WhisperX specific params can be added here if needed in the future

      setProgress(30)
      toast.info('AI가 음성을 텍스트로 변환하는 중...')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      setProgress(70)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: 서버 응답을 파싱할 수 없습니다.`
        }));
        throw new Error(errorData.error || `HTTP ${response.status}: 서버 오류가 발생했습니다.`);
      }

      const result = await response.json()
      
      setRawSubtitles(result.rawSubtitles)
      setArrangedSubtitles(result.arrangedSubtitles)
      
      // These are not available in the new flow, can be removed or adapted if needed
      // setRawSubtitlesUrl(result.rawSubtitlesUrl)
      // setArrangedSubtitlesUrl(result.arrangedSubtitlesUrl)
      
      setProgress(90)
      
      // Save transcripts to the database
      if (recordingId && result.rawSubtitles && result.arrangedSubtitles) {
        try {
          await recordings.update(recordingId, {
            transcript: result.rawSubtitles,     // 단어 단위 자막
            subtitles: result.arrangedSubtitles  // 구문 단위 자막
          })
          console.log('Transcripts saved to database')
        } catch (dbError) {
          console.error('Failed to save transcripts:', dbError)
          toast.error('텍스트 저장 중 오류가 발생했습니다.')
        }
      }
      
      setProgress(100)
      toast.success('음성 텍스트 변환이 완료되었습니다!')
      setIsSuccess(true)
      
    } catch (error: any) {
      console.error('처리 오류:', error)
      const errorMessage = error.message || '처리 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div>
                      <h2 className="text-xl font-bold">{isRegenerate ? 'AI 자막 · 텍스트 재생성' : 'AI 자막 · 텍스트 생성'}</h2>
          <p className="text-sm text-gray-600 mt-1">녹음된 강의 음성을 텍스트로 생성합니다</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-purple-600" />
                음성 파일 준비 완료
              </CardTitle>
              <CardDescription>
                {selectedFile ? `${selectedFile.name} - ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB` : '녹음 파일이 자동으로 로드되었습니다'}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Model Settings */}
          <Card>
            <CardHeader>
              <CardTitle>AI 프롬프트</CardTitle>
              <CardDescription>고유명사, 전문 용어 등을 미리 알려주면 AI가 음성을 더 정확한 텍스트로 변환합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>프롬프트 입력 (선택사항)</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="예: Rozeta, LangChain, Vercel AI SDK, Next.js와 같은 전문 용어나 사람 이름(홍길동)을 입력하면 AI가 더 정확하게 인식합니다."
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">고유명사, 전문 용어, 자주 틀리는 단어를 입력해주세요.</p>
              </div>
            </CardContent>
          </Card>

          {/* Processing Button and Status */}
          <Card>
            <CardContent className="pt-6 space-y-4">


              {/* 텍스트 변환 버튼 */}
              <Button
                onClick={async () => {
                  if (!recordingId || !audioUrl) {
                    toast.error("녹음 정보가 없습니다.")
                    return
                  }
                  
                  setIsStarting(true)
                  
                  // 백그라운드 작업을 시작하고 즉시 모달 닫기
                  startTranscription(recordingId, audioUrl, {
                    stableTs,
                    removeRepeated,
                    merge,
                    prompt,
                    regenerate: isRegenerate
                  }).catch(error => {
                    console.error('Failed to start transcription:', error)
                    toast.error('텍스트 변환 시작에 실패했습니다.')
                  })
                  
                  // 즉시 모달 닫고 알림 표시
                  toast.info('텍스트 변환이 시작되었습니다. 백그라운드에서 진행됩니다.')
                  if (onBack) {
                    onBack()
                  }
                }}
                disabled={!selectedFile || isStarting}
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
                  {isRegenerate ? '텍스트 다시 변환 시작' : '텍스트 변환 시작'}
                  </>
                )}
              </Button>

              {isProcessing && (
                <div className="mt-6 space-y-3">
                  <Progress value={progress} className="h-2" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {progress < 30 ? '파일 준비 중...' :
                       progress < 70 ? 'AI가 음성을 분석하고 있습니다...' :
                       '텍스트 변환을 마무리하고 있습니다...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      강의 길이에 따라 수 분이 소요될 수 있습니다
                    </p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {isSuccess && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-900">텍스트 변환 완료!</p>
                      <p className="text-sm text-green-700 mt-1">
                        결과가 저장되었습니다. 잠시 후 창이 자동으로 닫힙니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}