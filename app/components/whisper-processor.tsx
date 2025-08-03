"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, Wand2, Download, FileAudio } from "lucide-react"
import { toast } from "sonner"

interface WhisperProcessorProps {
  recordingId?: string
  audioUrl?: string
  onBack: () => void
}

export default function WhisperProcessor({ recordingId, audioUrl, onBack }: WhisperProcessorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [modelSize, setModelSize] = useState("turbo")
  const [language, setLanguage] = useState("Auto")
  const [stableTs, setStableTs] = useState(true)
  const [removeRepeated, setRemoveRepeated] = useState(true)
  const [merge, setMerge] = useState(true)
  const [prompt, setPrompt] = useState(`예시)
This is a university lecture on Natural Language Processing (NLP, 자연어처리).
Language: primarily Korean with English technical terms.
Key terms: Recurrent Neural Network (RNN), Long Short-Term Memory (LSTM), Transformer, attention mechanism, word embeddings.`)
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
      toast.info('Whisper AI로 음성을 처리하는 중...')

      // Python Whisper 서버로 요청
      const whisperServerUrl = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || 'http://localhost:8000'
      const response = await fetch(`${whisperServerUrl}/api/whisper/process`, {
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
      
      setProgress(100)
      toast.success('자막 생성이 완료되었습니다!')
      
    } catch (error) {
      console.error('처리 오류:', error)
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Whisper AI 자막 생성</h1>
            <p className="text-sm text-gray-600">음성 파일을 자막으로 변환합니다</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-4">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileAudio className="w-5 h-5 text-purple-600" />
                  오디오 파일
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedFile.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Model Settings */}
            <Card>
              <CardHeader>
                <CardTitle>모델 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Whisper 모델</Label>
                    <Select value={modelSize} onValueChange={setModelSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiny">tiny</SelectItem>
                        <SelectItem value="base">base</SelectItem>
                        <SelectItem value="small">small</SelectItem>
                        <SelectItem value="medium">medium</SelectItem>
                        <SelectItem value="large">large</SelectItem>
                        <SelectItem value="large-v2">large-v2</SelectItem>
                        <SelectItem value="large-v3">large-v3</SelectItem>
                        <SelectItem value="turbo">turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>언어</Label>
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
                        <SelectItem value="es">스페인어</SelectItem>
                        <SelectItem value="fr">프랑스어</SelectItem>
                        <SelectItem value="de">독일어</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stable-ts"
                    checked={stableTs}
                    onCheckedChange={(checked) => setStableTs(checked as boolean)}
                  />
                  <Label htmlFor="stable-ts">stable-ts 사용</Label>
                </div>

                <div className="space-y-2">
                  <Label>자막 정리 옵션</Label>
                  <div className="space-y-2 pl-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remove-repeated"
                        checked={removeRepeated}
                        onCheckedChange={(checked) => setRemoveRepeated(checked as boolean)}
                      />
                      <Label htmlFor="remove-repeated">반복 단어 제거</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="merge"
                        checked={merge}
                        onCheckedChange={(checked) => setMerge(checked as boolean)}
                      />
                      <Label htmlFor="merge">완전한 문장으로 병합</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>프롬프트 (선택사항)</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    placeholder="강의 내용에 대한 힌트를 입력하세요..."
                  />
                </div>

                <Button
                  onClick={processAudio}
                  disabled={!selectedFile || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  자막 생성
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-center text-gray-600">처리 중... {progress}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-4">
            {/* Raw Subtitles */}
            <Card>
              <CardHeader>
                <CardTitle>원본 자막</CardTitle>
                <CardDescription>Whisper가 생성한 원본 자막입니다</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rawSubtitles}
                  onChange={(e) => setRawSubtitles(e.target.value)}
                  rows={10}
                  placeholder="자막이 여기에 표시됩니다..."
                  className="font-mono text-sm"
                />
                {rawSubtitlesUrl && (
                  <Button
                    onClick={() => window.open(rawSubtitlesUrl, '_blank')}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    원본 자막 다운로드 (SRT)
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Arranged Subtitles */}
            <Card>
              <CardHeader>
                <CardTitle>정리된 자막</CardTitle>
                <CardDescription>문장 단위로 정리된 자막입니다</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={arrangedSubtitles}
                  onChange={(e) => setArrangedSubtitles(e.target.value)}
                  rows={10}
                  placeholder="정리된 자막이 여기에 표시됩니다..."
                  className="font-mono text-sm"
                />
                {arrangedSubtitlesUrl && (
                  <Button
                    onClick={() => window.open(arrangedSubtitlesUrl, '_blank')}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    정리된 자막 다운로드 (SRT)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 