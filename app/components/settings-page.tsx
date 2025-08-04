"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, User, Mic, Brain, Bell, Database, Camera } from "lucide-react"
import { auth } from "@/lib/supabase"
import { settingsDb } from "@/lib/database"

interface SettingsPageProps {
}

export default function SettingsPage({}: SettingsPageProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // 프로필 설정
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [profileImage, setProfileImage] = useState("")
  
  // 녹음 설정
  const [recordingQuality, setRecordingQuality] = useState("high")
  const [autoSave, setAutoSave] = useState(true)
  const [autoStartRecording, setAutoStartRecording] = useState(false)
  
  // AI 설정
  const [whisperModel, setWhisperModel] = useState("base")
  const [autoTranscribe, setAutoTranscribe] = useState(true)
  const [summarizeNotes, setSummarizeNotes] = useState(true)
  
  // 알림 설정
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [recordingReminders, setRecordingReminders] = useState(false)

  useEffect(() => {
    loadUserAndSettings()
  }, [])

  const loadUserAndSettings = async () => {
    try {
      const user = await auth.getUser()
      console.log("Auth user:", user)
      
      if (user) {
        setUser(user)
        setEmail(user.email || "")
        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || "")
        setProfileImage(user.user_metadata?.avatar_url || "")
        
        // 설정 불러오기
        const settings = await settingsDb.get()
        if (settings) {
          // 프로필
          if (settings.profile) {
            setDisplayName(settings.profile.display_name || displayName)
            setProfileImage(settings.profile.avatar_url || profileImage)
          }
          
          // 녹음 설정
          if (settings.recording) {
            setRecordingQuality(settings.recording.quality || "high")
            setAutoSave(settings.recording.auto_save ?? true)
            setAutoStartRecording(settings.recording.auto_start ?? false)
          }
          
          // AI 설정
          if (settings.ai) {
            setWhisperModel(settings.ai.whisper_model || "base")
            setAutoTranscribe(settings.ai.auto_transcribe ?? true)
            setSummarizeNotes(settings.ai.summarize_notes ?? true)
          }
          
          // 알림 설정
          if (settings.notifications) {
            setEmailNotifications(settings.notifications.email ?? true)
            setInAppNotifications(settings.notifications.in_app ?? true)
            setRecordingReminders(settings.notifications.reminders ?? false)
          }
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const settings = {
        profile: {
          display_name: displayName,
          avatar_url: profileImage
        },
        recording: {
          quality: recordingQuality,
          auto_save: autoSave,
          auto_start: autoStartRecording
        },
        ai: {
          whisper_model: whisperModel,
          auto_transcribe: autoTranscribe,
          summarize_notes: summarizeNotes
        },
        notifications: {
          email: emailNotifications,
          in_app: inAppNotifications,
          reminders: recordingReminders
        }
      }
      
      await settingsDb.update(settings)
      
      // 사용자 메타데이터 업데이트
      if (user) {
        try {
          const updateResult = await auth.updateUser({
            data: { 
              display_name: displayName,
              avatar_url: profileImage
            }
          })
          console.log("User update result:", updateResult)
        } catch (updateError) {
          console.error("Error updating user metadata:", updateError)
        }
      }
      
      toast({
        title: "설정이 저장되었습니다",
        description: "모든 변경사항이 성공적으로 저장되었습니다.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "설정 저장 실패",
        description: "설정을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExportData = async () => {
    try {
      toast({
        title: "데이터 내보내기 중...",
        description: "잠시만 기다려주세요.",
      })
      
      // TODO: 실제 데이터 내보내기 구현
      setTimeout(() => {
        toast({
          title: "데이터 내보내기 완료",
          description: "모든 데이터가 성공적으로 내보내졌습니다.",
        })
      }, 2000)
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "내보내기 실패",
        description: "데이터를 내보내는 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }

  const handleResetData = async () => {
    if (window.confirm("정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      try {
        // TODO: 실제 데이터 초기화 구현
        toast({
          title: "데이터 초기화 완료",
          description: "모든 데이터가 초기화되었습니다.",
        })
      } catch (error) {
        console.error("Error resetting data:", error)
        toast({
          title: "초기화 실패",
          description: "데이터를 초기화하는 중 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로 가기
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">설정</h1>
        <p className="text-gray-600">Rozeta 사용 환경을 설정하세요</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            프로필
          </TabsTrigger>
          <TabsTrigger value="recording" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            녹음
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            알림
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            데이터
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>
                다른 사용자에게 표시될 프로필 정보를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback>
                    {displayName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="profile-image" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Camera className="w-4 h-4 mr-2" />
                        프로필 사진 변경
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="display-name">표시 이름</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500">
                  이메일은 변경할 수 없습니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>녹음 설정</CardTitle>
              <CardDescription>
                녹음 품질과 자동화 옵션을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recording-quality">녹음 품질</Label>
                <Select value={recordingQuality} onValueChange={setRecordingQuality}>
                  <SelectTrigger id="recording-quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">낮음 (64 kbps)</SelectItem>
                    <SelectItem value="medium">중간 (128 kbps)</SelectItem>
                    <SelectItem value="high">높음 (256 kbps)</SelectItem>
                    <SelectItem value="ultra">최고 (320 kbps)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  높은 품질일수록 파일 크기가 커집니다
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-save">자동 저장</Label>
                    <p className="text-sm text-gray-500">
                      녹음 종료 시 자동으로 저장합니다
                    </p>
                  </div>
                  <Switch
                    id="auto-save"
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-start">자동 녹음 시작</Label>
                    <p className="text-sm text-gray-500">
                      강의 자료 선택 시 자동으로 녹음을 시작합니다
                    </p>
                  </div>
                  <Switch
                    id="auto-start"
                    checked={autoStartRecording}
                    onCheckedChange={setAutoStartRecording}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI 처리 설정</CardTitle>
              <CardDescription>
                AI 모델과 자동 처리 옵션을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="whisper-model">Whisper 모델</Label>
                <Select value={whisperModel} onValueChange={setWhisperModel}>
                  <SelectTrigger id="whisper-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiny">Tiny (가장 빠름)</SelectItem>
                    <SelectItem value="base">Base (균형)</SelectItem>
                    <SelectItem value="small">Small (정확도 향상)</SelectItem>
                    <SelectItem value="medium">Medium (높은 정확도)</SelectItem>
                    <SelectItem value="large">Large (최고 정확도)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  더 큰 모델일수록 정확도는 높지만 처리 시간이 오래 걸립니다
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-transcribe">자동 텍스트 변환</Label>
                    <p className="text-sm text-gray-500">
                      녹음 종료 시 자동으로 음성을 텍스트로 변환합니다
                    </p>
                  </div>
                  <Switch
                    id="auto-transcribe"
                    checked={autoTranscribe}
                    onCheckedChange={setAutoTranscribe}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="summarize-notes">노트 요약</Label>
                    <p className="text-sm text-gray-500">
                      AI가 강의 내용을 자동으로 요약합니다
                    </p>
                  </div>
                  <Switch
                    id="summarize-notes"
                    checked={summarizeNotes}
                    onCheckedChange={setSummarizeNotes}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>
                알림 수신 방법을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">이메일 알림</Label>
                  <p className="text-sm text-gray-500">
                    중요한 업데이트를 이메일로 받습니다
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="in-app-notifications">앱 내 알림</Label>
                  <p className="text-sm text-gray-500">
                    앱 사용 중 알림을 표시합니다
                  </p>
                </div>
                <Switch
                  id="in-app-notifications"
                  checked={inAppNotifications}
                  onCheckedChange={setInAppNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="recording-reminders">녹음 알림</Label>
                  <p className="text-sm text-gray-500">
                    예약된 강의 시간에 녹음 알림을 받습니다
                  </p>
                </div>
                <Switch
                  id="recording-reminders"
                  checked={recordingReminders}
                  onCheckedChange={setRecordingReminders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>데이터 관리</CardTitle>
              <CardDescription>
                데이터를 내보내거나 초기화할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">데이터 내보내기</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    모든 녹음, 노트, 설정을 다운로드합니다
                  </p>
                  <Button variant="outline" onClick={handleExportData}>
                    데이터 내보내기
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2 text-red-600">데이터 초기화</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    모든 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                  <Button variant="destructive" onClick={handleResetData}>
                    모든 데이터 초기화
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? "저장 중..." : "설정 저장"}
        </Button>
      </div>
    </div>
  )
}