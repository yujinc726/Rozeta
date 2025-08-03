"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Mic, Timer, Play, FileAudio, Clock, Folder, Settings, Search, ArrowLeft, Edit } from "lucide-react"
import RecordPageComponent from "./record-page"
import RecordDetail from "./record-detail"
import SharedSidebar from "./shared-sidebar"
import HomeDashboard from "./home-dashboard"
import SettingsPage from "./settings-page"
import { toast } from "sonner"
import { subjects as subjectsDb, recordings as recordingsDb } from "@/lib/database"
import type { Subject as DbSubject, Recording as DbRecording } from "@/lib/supabase"
import { testSupabaseConnection, auth } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface Subject {
  id: string
  name: string
  recordingCount: number
  timerCount: number
}

interface Recording {
  id: string
  name: string
  duration: string
  date: string
  size: string
  pdfFileName?: string
  audioUrl?: string
  slideRecords?: SlideRecord[]
}

interface SlideRecord {
  id: string
  pdfFileName: string
  slideNumber: number
  startTime: string
  endTime?: string
  memo?: string
}

interface TimerRecord {
  id: string
  sessionName: string
  slideCount: number
  totalDuration: string
  date: string
}

interface MainAppProps {
  onBackToHome: () => void
}

export default function MainApp({ onBackToHome }: MainAppProps) {
  const [user, setUser] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [isAddingSubject, setIsAddingSubject] = useState(false)
  const [currentView, setCurrentView] = useState<'home' | 'main' | 'record' | 'detail' | 'settings'>('home')
  const [selectedRecording, setSelectedRecording] = useState<DbRecording | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [recordings, setRecordings] = useState<DbRecording[]>([])
  const [allRecordings, setAllRecordings] = useState<DbRecording[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(false)

  // 사용자 정보 가져오기
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const u = await auth.getUser()
        setUser(u)
        setIsLoaded(true)
        if (u) {
          await testSupabaseConnection()
        }
      } catch (error) {
        console.error('Failed to get user:', error)
        setIsLoaded(true)
      }
    }
    initializeUser()
  }, [])

  // 과목 목록 불러오기
  useEffect(() => {
    if (user && isLoaded) {
      loadSubjects()
      loadAllRecordings()
    }
  }, [user, isLoaded])

  // 선택된 과목의 녹음 목록 불러오기
  useEffect(() => {
    if (selectedSubject) {
      loadRecordings()
    }
  }, [selectedSubject])

  const loadSubjects = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      const dbSubjects = await subjectsDb.getAll()
      
      // 각 과목의 녹음 수 계산
      const subjectsWithCounts = await Promise.all(
        dbSubjects.map(async (subject) => {
          const recordings = await recordingsDb.getBySubject(subject.id)
          return {
            id: subject.id,
            name: subject.name,
            recordingCount: recordings.length,
            timerCount: 0 // 타이머 기능은 제거됨
          }
        })
      )
      
      setSubjects(subjectsWithCounts)
      if (subjectsWithCounts.length > 0 && !selectedSubject) {
        setSelectedSubject(subjectsWithCounts[0])
      }
    } catch (error) {
      console.error('Failed to load subjects:', error)
      toast.error('과목 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecordings = async () => {
    if (!selectedSubject) return
    
    try {
      setLoadingRecordings(true)
      const dbRecordings = await recordingsDb.getBySubject(selectedSubject.id)
      setRecordings(dbRecordings)
    } catch (error) {
      console.error('Failed to load recordings:', error)
      toast.error('녹음 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoadingRecordings(false)
    }
  }

  const loadAllRecordings = async () => {
    if (!user) return
    
    try {
      const dbRecordings = await recordingsDb.getAll()
      setAllRecordings(dbRecordings)
    } catch (error) {
      console.error('Failed to load all recordings:', error)
    }
  }

  const handleAddSubject = async (name: string) => {
    if (!user) {
      console.error('No user found')
      toast.error('로그인이 필요합니다.')
      return
    }
    
    console.log('Adding subject:', { name })
    
    try {
      const newSubject = await subjectsDb.create(name)
      
      const subjectWithCounts = {
        id: newSubject.id,
        name: newSubject.name,
        recordingCount: 0,
        timerCount: 0,
      }
      
      setSubjects([...subjects, subjectWithCounts])
      setSelectedSubject(subjectWithCounts)
      // toast.success('과목이 추가되었습니다.')
    } catch (error) {
      console.error('Failed to add subject:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
        if (error.message.includes('Invalid URL') || error.message.includes('NEXT_PUBLIC_SUPABASE')) {
          toast.error('Supabase 설정이 필요합니다. .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.')
        } else if (error.message.includes('JWT')) {
          toast.error('인증 오류가 발생했습니다. 다시 로그인해주세요.')
        } else {
          toast.error(`과목 추가 실패: ${error.message}`)
        }
      } else {
        toast.error('과목 추가에 실패했습니다.')
      }
    }
  }

  const handleEditSubject = async (id: string, newName: string) => {
    try {
      await subjectsDb.update(id, { name: newName })
      
      setSubjects(subjects.map(subject => 
        subject.id === id ? { ...subject, name: newName } : subject
      ))
      // 현재 선택된 과목의 이름도 업데이트
      if (selectedSubject?.id === id) {
        setSelectedSubject(prev => prev ? { ...prev, name: newName } : null)
      }
      // toast.success('과목명이 변경되었습니다.')
    } catch (error) {
      console.error('Failed to update subject:', error)
      toast.error('과목명 변경에 실패했습니다.')
    }
  }

  const handleDeleteSubject = async (id: string) => {
    try {
      await subjectsDb.delete(id)
      
      setSubjects(subjects.filter(subject => subject.id !== id))
      // 삭제된 과목이 현재 선택된 과목이면 선택 해제
      if (selectedSubject?.id === id) {
        const remainingSubjects = subjects.filter(s => s.id !== id)
        setSelectedSubject(remainingSubjects.length > 0 ? remainingSubjects[0] : null)
      }
      // toast.success('과목이 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to delete subject:', error)
      toast.error('과목 삭제에 실패했습니다.')
    }
  }

  const handleStartRecording = () => {
    if (selectedSubject) {
      setCurrentView('record')
    }
  }

  // 조건부 렌더링으로 각 뷰를 처리
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        // 홈 화면을 위한 데이터
        const weeklyProgress = [
          { day: '월', minutes: 0 },
          { day: '화', minutes: 0 },
          { day: '수', minutes: 0 },
          { day: '목', minutes: 0 },
          { day: '금', minutes: 0 },
          { day: '토', minutes: 0 },
          { day: '일', minutes: 0 }
        ]
        
        const recentActivities = allRecordings.map(rec => ({
          id: rec.id,
          type: 'recording' as const,
          subjectName: subjects.find(s => s.id === rec.subject_id)?.name || '알 수 없음',
          title: rec.title,
          date: new Date(rec.created_at).toLocaleDateString('ko-KR'),
          duration: rec.duration ? `${Math.floor(rec.duration / 60)}분` : '처리중'
        }))
        
        return (
          <HomeDashboard
            userName={user?.email?.split('@')[0] || "사용자"}
            totalSubjects={subjects.length}
            totalRecordings={allRecordings.length}
            totalStudyTime={(() => {
              const totalSeconds = allRecordings.reduce((acc, rec) => acc + (rec.duration || 0), 0)
              const hours = Math.floor(totalSeconds / 3600)
              const minutes = Math.floor((totalSeconds % 3600) / 60)
              return `${hours}시간 ${minutes}분`
            })()}
            recentActivities={recentActivities.slice(0, 5)}
            weeklyProgress={weeklyProgress}
            onStartRecording={() => {
              if (subjects.length === 0) {
                // 과목이 없으면 먼저 과목을 추가하도록 안내
                alert('먼저 과목을 추가해주세요.')
                return
              }
              // 첫 번째 과목을 선택하고 녹음 화면으로 이동
              setSelectedSubject(subjects[0])
              setCurrentView('record')
            }}
            onViewRecentNote={() => {
              if (recordings.length > 0) {
                setSelectedRecording(recordings[0])
                setCurrentView('detail')
              }
            }}
            onViewAIAnalysis={() => {
              // AI 분석 기능 준비 중
            }}
          />
        )
      case 'record':
        if (!selectedSubject) return null
        return (
          <RecordPageComponent 
            subjectName={selectedSubject.name} 
            subjectId={selectedSubject.id}
            onBack={() => setCurrentView('main')}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )

      case 'detail':
        if (!selectedRecording) return null
        return (
          <RecordDetail
            recording={selectedRecording}
            onBack={() => setCurrentView('main')}
            onOpenAIExplanation={() => {
              // TODO: AI 설명 화면으로 이동
              // toast.info('AI 설명 기능은 준비 중입니다.')
            }}
          />
        )
      case 'settings':
        return (
          <SettingsPage
            onBack={() => setCurrentView('home')}
          />
        )
      default:
        return null
    }
  }

  // 모든 화면에서 사이드바를 포함하는 레이아웃
  if (currentView !== 'main') {
    return (
      <div className="flex h-screen bg-gray-50">
        <SharedSidebar
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSelectSubject={(subject) => {
            setSelectedSubject(subject)
            setCurrentView('main')
          }}
          onAddSubject={handleAddSubject}
          onEditSubject={handleEditSubject}
          onDeleteSubject={handleDeleteSubject}
          onBackToHome={onBackToHome}
          onNavigateHome={() => {
            setSelectedSubject(null)
            setCurrentView('home')
          }}
          onOpenSettings={() => {
            setCurrentView('settings')
          }}
          currentView={currentView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className={cn(
          "flex-1 transition-all duration-300",
          isSidebarCollapsed ? "ml-16" : "ml-80"
        )}>
          {renderContent()}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Shared Sidebar */}
      <SharedSidebar
        subjects={subjects}
        selectedSubject={selectedSubject}
        onSelectSubject={(subject) => {
          setSelectedSubject(subject)
          setCurrentView('main')
        }}
        onAddSubject={handleAddSubject}
        onEditSubject={handleEditSubject}
        onDeleteSubject={handleDeleteSubject}
        onBackToHome={onBackToHome}
        onNavigateHome={() => {
          setSelectedSubject(null)
          setCurrentView('home')
        }}
        onOpenSettings={() => {
          setCurrentView('settings')
        }}
        currentView={currentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "ml-16" : "ml-80"
      )}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">과목 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : selectedSubject ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedSubject.name}</h1>
                  <p className="text-gray-600 mt-1">
                    전체 기록 {selectedSubject.recordingCount + selectedSubject.timerCount}개
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleStartRecording}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    새 기록 시작
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-auto">
              {/* All Records Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileAudio className="w-5 h-5 text-purple-600" />
                    기록 목록
                  </CardTitle>
                  <CardDescription>수업 중 작성한 모든 기록들을 확인하고 관리하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRecordings ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : recordings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      아직 녹음된 파일이 없습니다
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {recordings.map((recording) => (
                      <div
                        key={recording.id}
                          onClick={() => {
                            setSelectedRecording(recording)
                            setCurrentView('detail')
                          }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FileAudio className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                              <p className="font-medium text-gray-900">{recording.title}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span>{recording.duration ? `${Math.floor(recording.duration / 60)}분` : '처리중'}</span>
                                <span>{new Date(recording.created_at).toLocaleDateString('ko-KR')}</span>
                                <span>{recording.audio_url ? '업로드 완료' : '업로드 중'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-50 text-green-700 border-green-200">
                              {recording.transcript ? '처리 완료' : '미처리'}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => e.stopPropagation()}
                            >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">과목을 선택하세요</h3>
              <p className="text-gray-500">좌측에서 과목을 선택하거나 새로운 과목을 추가해보세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}