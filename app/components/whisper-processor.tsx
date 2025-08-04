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
import { ArrowLeft, Upload, Wand2, Download, FileAudio, X } from "lucide-react"
import { toast } from "sonner"
import { recordings } from "@/lib/database"

interface WhisperProcessorProps {
  recordingId?: string
  audioUrl?: string
  onBack?: () => void
}

export default function WhisperProcessor({ recordingId, audioUrl, onBack }: WhisperProcessorProps) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [modelSize, setModelSize] = useState("large-v3")
  const [language, setLanguage] = useState("Auto")
  const [stableTs, setStableTs] = useState(true)
  const [removeRepeated, setRemoveRepeated] = useState(true)
  const [merge, setMerge] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rawSubtitles, setRawSubtitles] = useState("")
  const [arrangedSubtitles, setArrangedSubtitles] = useState("")
  const [rawSubtitlesUrl, setRawSubtitlesUrl] = useState("")
  const [arrangedSubtitlesUrl, setArrangedSubtitlesUrl] = useState("")

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
    if (!selectedFile) {
      toast.error('오디오 파일을 선택해주세요.')
      return
    }

    setIsProcessing(true)
    setProgress(10)

    try {
      // 1. 파일 업로드
      const formData = new FormData()
      formData.append('audio', selectedFile)
      formData.append('modelSize', modelSize)
      formData.append('language', language)
      formData.append('stableTs', stableTs.toString())
      formData.append('removeRepeated', removeRepeated.toString())
      formData.append('merge', merge.toString())
      formData.append('prompt', prompt)

      setProgress(30)
      toast.info('AI가 음성을 텍스트로 변환하는 중...')

      // Next.js API Route로 요청
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('처리 중 오류가 발생했습니다.')
      }

      setProgress(70)
      
      const result = await response.json()
      
      setRawSubtitles(result.rawSubtitles)
      setArrangedSubtitles(result.arrangedSubtitles)
      setRawSubtitlesUrl(result.rawSubtitlesUrl)
      setArrangedSubtitlesUrl(result.arrangedSubtitlesUrl)
      
      setProgress(90)
      
      // 데이터베이스에 transcript 저장
      if (recordingId && result.arrangedSubtitles) {
        try {
          await recordings.update(recordingId, {
            transcript: result.arrangedSubtitles
          })
          console.log('Transcript saved to database')
        } catch (dbError) {
          console.error('Failed to save transcript:', dbError)
          toast.error('텍스트 저장 중 오류가 발생했습니다.')
        }
      }
      
      setProgress(100)
      toast.success('음성 텍스트 변환이 완료되었습니다!')
      
    } catch (error) {
      console.error('처리 오류:', error)
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-bold">AI 텍스트 변환</h2>
          <p className="text-sm text-gray-600 mt-1">녹음된 강의 음성을 텍스트로 변환합니다</p>
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
              <CardTitle>변환 설정</CardTitle>
              <CardDescription>음성 인식을 위한 상세 설정을 구성합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>AI 모델 크기</Label>
                  <Select value={modelSize} onValueChange={setModelSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="large-v3">Large-v3 (최고 정확도, 권장)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Incredibly Fast Whisper 모델을 사용합니다</p>
                </div>
                <div className="space-y-2">
                  <Label>강의 언어</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">자동 감지</SelectItem>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">영어</SelectItem>
                      <SelectItem value="ja">일본어</SelectItem>
                      <SelectItem value="zh">중국어</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">주 언어를 선택하면 더 정확합니다</p>
                </div>
              </div>

              {/* 텍스트 정리 옵션 - 임시 비활성화
              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">텍스트 정리 옵션</Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="stable-ts"
                      checked={stableTs}
                      onCheckedChange={(checked) => setStableTs(checked as boolean)}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="stable-ts" className="font-normal cursor-pointer">
                        타임스탬프 안정화
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">더 정확한 시간 동기화를 위해 사용합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="remove-repeated"
                      checked={removeRepeated}
                      onCheckedChange={(checked) => setRemoveRepeated(checked as boolean)}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="remove-repeated" className="font-normal cursor-pointer">
                        반복 단어 제거
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">"어... 그... 음..." 같은 불필요한 반복을 제거합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="merge"
                      checked={merge}
                      onCheckedChange={(checked) => setMerge(checked as boolean)}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="merge" className="font-normal cursor-pointer">
                        문장 자동 병합
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">짧게 끊긴 문장을 자연스럽게 연결합니다</p>
                    </div>
                  </div>
                </div>
              </div>
              */}

              <div className="pt-6">
                <Label>강의 내용 힌트 (선택사항)</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="예시) 컴퓨터 공학 강의, 자료구조, 알고리즘, Binary Search Tree, Hash Table 등의 용어가 나옵니다..."
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">전문 용어나 고유명사를 입력하면 인식률이 향상됩니다</p>
              </div>
            </CardContent>
          </Card>

          {/* Processing Button and Status */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={processAudio}
                disabled={!selectedFile || isProcessing}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    텍스트 변환 중...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    텍스트 변환 시작
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
              {!isProcessing && rawSubtitles && (
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
                        음성이 성공적으로 텍스트로 변환되었습니다.
                      </p>
                      <Button
                        onClick={() => {
                          if (onBack) {
                            onBack()
                          } else {
                            router.back()
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="mt-3 text-green-700 border-green-300 hover:bg-green-100"
                      >
                        창 닫기
                      </Button>
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