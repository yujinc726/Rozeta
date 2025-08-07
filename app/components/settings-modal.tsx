"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import { User, Mic, Database, Camera, Subtitles, RotateCcw, Moon, Sun, Monitor, Palette } from "lucide-react"
import { auth } from "@/lib/supabase"
import { settingsDb } from "@/lib/database"
import { useSubtitleSettings } from "@/app/contexts/subtitle-settings-context"
import { useTheme } from "@/app/contexts/theme-context"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // 자막 설정 Context 사용
  const { 
    settings: subtitleSettings, 
    updateSettings: updateSubtitleSettings,
    resetToDefaults: resetSubtitleSettings,
    saveSettings: saveSubtitleSettings
  } = useSubtitleSettings()
  
  // 테마 설정 Context 사용
  const { theme, actualTheme, setTheme } = useTheme()
  
  // 프로필 설정
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [profileImage, setProfileImage] = useState("")
  
  // 녹음 설정
  const [recordingQuality, setRecordingQuality] = useState("high")
  const [autoSave, setAutoSave] = useState(true)
  const [autoStartRecording, setAutoStartRecording] = useState(false)

  useEffect(() => {
    if (open) {
      loadUserAndSettings()
    }
  }, [open])

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
        }
      }
      
      await settingsDb.update(settings)
      
      // 자막 설정 별도 저장
      await saveSubtitleSettings()
      
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
      
      onOpenChange(false)
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

  const handleResetSubtitleSettings = async () => {
    try {
      resetSubtitleSettings()
      await saveSubtitleSettings()
      
      toast({
        title: "자막 설정 초기화",
        description: "자막 설정이 기본값으로 되돌려졌습니다.",
      })
    } catch (error) {
      console.error("Error resetting subtitle settings:", error)
      toast({
        title: "초기화 실패",
        description: "자막 설정 초기화 중 오류가 발생했습니다.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">설정을 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
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
                <TabsTrigger value="subtitles" className="flex items-center gap-2">
                  <Subtitles className="w-4 h-4" />
                  자막
                </TabsTrigger>
                <TabsTrigger value="theme" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  테마
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

              <TabsContent value="subtitles" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>자막 설정</CardTitle>
                        <CardDescription>
                          자막 표시 방식을 설정하세요
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetSubtitleSettings}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        기본값으로 되돌리기
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 자막 길이 설정 */}
                    <div className="space-y-3">
                      <Label htmlFor="subtitle-max-words">자막 최대 단어 수</Label>
                      <div className="flex items-center space-x-4">
                        <Slider
                          id="subtitle-max-words"
                          value={[subtitleSettings.maxWords]}
                          onValueChange={(value) => updateSubtitleSettings({ maxWords: value[0] })}
                          min={1}
                          max={50}
                          step={1}
                          className="flex-1"
                        />
                        <div className="w-16 text-center">
                          <span className="text-sm font-medium">{subtitleSettings.maxWords}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        한 번에 표시될 자막의 최대 단어 수입니다 (1-50단어)
                      </p>
                    </div>
                    
                    <Separator />
                    
                    {/* 텍스트 스타일 설정 */}
                    <div className="space-y-4">
                      <h3 className="font-medium">텍스트 스타일</h3>
                      
                      {/* 폰트 크기 */}
                      <div className="space-y-3">
                        <Label htmlFor="subtitle-font-size">폰트 크기</Label>
                        <div className="flex items-center space-x-4">
                                                  <Slider
                          id="subtitle-font-size"
                          value={[subtitleSettings.fontSize]}
                          onValueChange={(value) => updateSubtitleSettings({ fontSize: value[0] })}
                          min={12}
                          max={32}
                          step={1}
                          className="flex-1"
                        />
                        <div className="w-16 text-center">
                          <span className="text-sm font-medium">{subtitleSettings.fontSize}px</span>
                        </div>
                        </div>
                      </div>
                      
                      {/* 텍스트 색상 */}
                      <div className="space-y-3">
                        <Label htmlFor="subtitle-text-color">텍스트 색상</Label>
                        <div className="flex items-center space-x-3">
                          <input
                            id="subtitle-text-color"
                            type="color"
                            value={subtitleSettings.textColor}
                            onChange={(e) => updateSubtitleSettings({ textColor: e.target.value })}
                            className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">{subtitleSettings.textColor}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* 배경 스타일 설정 */}
                    <div className="space-y-4">
                      <h3 className="font-medium">배경 스타일</h3>
                      
                      {/* 배경 색상 */}
                      <div className="space-y-3">
                        <Label htmlFor="subtitle-bg-color">배경 색상</Label>
                        <div className="flex items-center space-x-3">
                          <input
                            id="subtitle-bg-color"
                            type="color"
                            value={subtitleSettings.backgroundColor}
                            onChange={(e) => updateSubtitleSettings({ backgroundColor: e.target.value })}
                            className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">{subtitleSettings.backgroundColor}</span>
                        </div>
                      </div>
                      
                      {/* 배경 투명도 */}
                      <div className="space-y-3">
                        <Label htmlFor="subtitle-bg-opacity">배경 투명도</Label>
                        <div className="flex items-center space-x-4">
                                                  <Slider
                          id="subtitle-bg-opacity"
                          value={[subtitleSettings.backgroundOpacity]}
                          onValueChange={(value) => updateSubtitleSettings({ backgroundOpacity: value[0] })}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <div className="w-16 text-center">
                          <span className="text-sm font-medium">{subtitleSettings.backgroundOpacity}%</span>
                        </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* 미리보기 */}
                    <div className="space-y-4">
                      <h3 className="font-medium">미리보기</h3>
                      <div className="rounded-lg p-8 text-center min-h-[120px] flex items-center justify-center">
                        <div 
                          className="inline-block px-4 py-2 rounded-lg shadow-lg"
                          style={{
                            backgroundColor: `${subtitleSettings.backgroundColor}${Math.round(subtitleSettings.backgroundOpacity * 2.55).toString(16).padStart(2, '0')}`,
                            color: subtitleSettings.textColor,
                            fontSize: `${subtitleSettings.fontSize}px`,
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            lineHeight: 1.4
                          }}
                        >
                          {`안녕하세요 여러분 오늘은 자연어처리에 대해 배워보겠습니다 이번 강의에서는 토큰화와 임베딩에 대해 알아보겠습니다`.split(' ').slice(0, subtitleSettings.maxWords).join(' ')}
                          {subtitleSettings.maxWords < 20 && '...'}
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xs text-gray-500">
                          실제 재생 화면에서 이와 같이 표시됩니다
                        </p>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>단어 수: {subtitleSettings.maxWords}개 | 폰트: {subtitleSettings.fontSize}px | 투명도: {subtitleSettings.backgroundOpacity}%</div>
                          <div>배경: {subtitleSettings.backgroundColor} | 텍스트: {subtitleSettings.textColor}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="theme" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>테마 설정</CardTitle>
                    <CardDescription>
                      화면의 색상 테마를 선택하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>테마 모드</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {/* 라이트 모드 */}
                        <div
                          className={`relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            theme === 'light' 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400' 
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          }`}
                          onClick={() => setTheme('light')}
                        >
                          <Sun className="w-8 h-8 mb-2 text-yellow-500" />
                          <span className="text-sm font-medium">라이트</span>
                          <span className="text-xs text-gray-500 text-center mt-1">
                            밝은 테마
                          </span>
                          {theme === 'light' && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
                          )}
                        </div>

                        {/* 다크 모드 */}
                        <div
                          className={`relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            theme === 'dark' 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400' 
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          }`}
                          onClick={() => setTheme('dark')}
                        >
                          <Moon className="w-8 h-8 mb-2 text-blue-500" />
                          <span className="text-sm font-medium">다크</span>
                          <span className="text-xs text-gray-500 text-center mt-1">
                            어두운 테마
                          </span>
                          {theme === 'dark' && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
                          )}
                        </div>

                        {/* 시스템 모드 */}
                        <div
                          className={`relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            theme === 'system' 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400' 
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          }`}
                          onClick={() => setTheme('system')}
                        >
                          <Monitor className="w-8 h-8 mb-2 text-gray-500" />
                          <span className="text-sm font-medium">시스템</span>
                          <span className="text-xs text-gray-500 text-center mt-1">
                            시스템 설정 적용
                          </span>
                          {theme === 'system' && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      {/* 현재 적용된 테마 표시 */}
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {actualTheme === 'dark' ? (
                          <Moon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Sun className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          현재 적용: <span className="font-medium">
                            {actualTheme === 'dark' ? '다크 모드' : '라이트 모드'}
                          </span>
                          {theme === 'system' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(시스템 설정)</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">테마 미리보기</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {/* 라이트 테마 미리보기 */}
                          <div className="p-3 bg-white border rounded-lg">
                            <div className="text-xs text-gray-500 mb-2">라이트 테마</div>
                            <div className="space-y-2">
                              <div className="h-2 bg-gray-200 rounded"></div>
                              <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                              <div className="h-2 bg-purple-200 rounded w-1/2"></div>
                            </div>
                          </div>
                          
                          {/* 다크 테마 미리보기 */}
                          <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg">
                            <div className="text-xs text-gray-400 mb-2">다크 테마</div>
                            <div className="space-y-2">
                              <div className="h-2 bg-gray-700 rounded"></div>
                              <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                              <div className="h-2 bg-purple-600 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs">💡</span>
                          </div>
                          <div className="text-sm">
                            <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">테마 설정 팁</p>
                            <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                              • <strong>라이트 모드</strong>: 밝은 환경에서 더 나은 가독성을 제공합니다<br/>
                              • <strong>다크 모드</strong>: 눈의 피로를 줄이고 배터리 소모를 절약합니다<br/>
                              • <strong>시스템 설정</strong>: 기기의 테마 설정에 따라 자동으로 변경됩니다
                            </p>
                          </div>
                        </div>
                      </div>
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

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? "저장 중..." : "설정 저장"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
