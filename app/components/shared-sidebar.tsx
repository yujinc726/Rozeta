"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, FileAudio, Folder, Settings, ArrowLeft, ChevronLeft, ChevronRight, Menu, MoreHorizontal, Edit, Trash2, Home, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/supabase"

interface Subject {
  id: string
  name: string
  recordingCount: number
  timerCount: number
}

interface SharedSidebarProps {
  subjects: Subject[]
  selectedSubject: Subject | null
  onSelectSubject: (subject: Subject) => void
  onAddSubject: (name: string) => void
  onEditSubject?: (id: string, newName: string) => void
  onDeleteSubject?: (id: string) => void
  onBackToHome?: () => void
  onNavigateHome?: () => void
  onOpenSettings?: () => void
  currentView?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function SharedSidebar({
  subjects,
  selectedSubject,
  onSelectSubject,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onBackToHome,
  onNavigateHome,
  onOpenSettings,
  currentView,
  isCollapsed = false,
  onToggleCollapse
}: SharedSidebarProps) {
  const [newSubjectName, setNewSubjectName] = useState("")
  const [isAddingSubject, setIsAddingSubject] = useState(false)
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    auth.getUser().then(setUser)
  }, [])

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      onAddSubject(newSubjectName.trim())
      setNewSubjectName("")
      setIsAddingSubject(false)
    }
  }

  const handleEditSubject = () => {
    if (editingSubject && editingSubject.name.trim() && onEditSubject) {
      onEditSubject(editingSubject.id, editingSubject.name.trim())
      setEditingSubject(null)
    }
  }

  const handleDeleteSubject = (subjectId: string) => {
    if (onDeleteSubject) {
      onDeleteSubject(subjectId)
    }
    setShowDeleteDialog(null)
  }

  return (
    <div className={cn(
      "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div 
          className={cn(
            "flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          onClick={onNavigateHome}
          title="홈으로 이동"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <FileAudio className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Rozeta</h1>
          )}
        </div>
      </div>

      {/* Subjects List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Home Button */}
          {onNavigateHome && (
            <Button
              variant="ghost"
              onClick={onNavigateHome}
              className={cn(
                "w-full mb-4",
                isCollapsed ? "justify-center p-2" : "justify-start",
                currentView === 'home' 
                  ? "bg-purple-50 text-purple-700 hover:bg-purple-100" 
                  : "hover:bg-gray-100"
              )}
            >
              <Home className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">홈</span>}
            </Button>
          )}
          
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">내 과목</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingSubject(true)}
                className="h-7 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                추가
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {!isCollapsed && isAddingSubject && (
              <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                <Input
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="과목명 입력"
                  className="h-8"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                />
                <Button size="sm" onClick={handleAddSubject}>
                  추가
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setIsAddingSubject(false)
                  setNewSubjectName("")
                }}>
                  취소
                </Button>
              </div>
            )}

            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={cn(
                  "group relative w-full rounded-lg transition-all",
                  selectedSubject?.id === subject.id
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'hover:bg-gray-50',
                  isCollapsed ? "p-2" : "p-3"
                )}
              >
                <button
                  onClick={() => onSelectSubject(subject)}
                  className="w-full text-left"
                  title={isCollapsed ? subject.name : undefined}
                >
                  <div className={cn(
                    "flex items-center",
                    isCollapsed ? "justify-center" : "gap-3"
                  )}>
                    <div className={cn(
                      "rounded flex items-center justify-center flex-shrink-0",
                      selectedSubject?.id === subject.id
                        ? 'bg-purple-200'
                        : 'bg-gray-100',
                      isCollapsed ? "w-8 h-8" : "w-8 h-8"
                    )}>
                      <Folder className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{subject.name}</p>
                        <span className="text-xs text-gray-500">
                          기록 {subject.recordingCount + subject.timerCount}개
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                
                {/* Options Menu - Only show when not collapsed and has edit/delete functions */}
                {!isCollapsed && (onEditSubject || onDeleteSubject) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEditSubject && (
                        <DropdownMenuItem 
                          onClick={() => setEditingSubject({ id: subject.id, name: subject.name })}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          과목명 변경
                        </DropdownMenuItem>
                      )}
                      {onDeleteSubject && (
                        <DropdownMenuItem 
                          onClick={() => setShowDeleteDialog(subject.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          과목 삭제
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            {isCollapsed && (
              <button
                onClick={() => {
                  onToggleCollapse?.()
                  setTimeout(() => setIsAddingSubject(true), 300)
                }}
                className="w-full p-2 hover:bg-gray-50 rounded-lg"
                title="과목 추가"
              >
                <Plus className="w-4 h-4 mx-auto" />
              </button>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Toggle Collapse Button - Centered on right edge */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-6 h-6 p-0 bg-white hover:bg-gray-100 rounded-full shadow-md border border-gray-200 transition-all z-50",
            isCollapsed ? "right-[-12px]" : "right-[-12px]"
          )}
          title={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>
      )}

      {/* User Profile & Settings */}
      <div className="p-4 border-t border-gray-200 relative">
        {/* User Profile */}
        <div className={cn(
          "mb-3 pb-3 border-b border-gray-100",
          isCollapsed && "border-0 mb-2 pb-0"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full hover:bg-gray-50",
                  isCollapsed ? "justify-center p-2" : "justify-start px-3 py-2"
                )}
              >
                <div className={cn(
                  "flex items-center gap-3 w-full",
                  isCollapsed && "justify-center"
                )}>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium truncate">{user?.email?.split('@')[0] || '사용자'}</div>
                        <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCollapsed ? "center" : "end"} className="w-56">
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="w-4 h-4 mr-2" />
                설정
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={async () => {
                  await auth.signOut()
                  window.location.href = '/'
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>과목명 변경</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editingSubject?.name || ""}
              onChange={(e) => setEditingSubject(prev => 
                prev ? { ...prev, name: e.target.value } : null
              )}
              placeholder="새 과목명을 입력하세요"
              onKeyPress={(e) => e.key === 'Enter' && handleEditSubject()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubject(null)}>
              취소
            </Button>
            <Button onClick={handleEditSubject}>
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subject Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>과목 삭제</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              이 과목을 삭제하시겠습니까? 과목과 관련된 모든 기록이 함께 삭제됩니다.
            </p>
            <p className="text-red-600 text-sm mt-2 font-medium">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteDialog && handleDeleteSubject(showDeleteDialog)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 