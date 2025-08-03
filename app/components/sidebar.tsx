"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, FileAudio, Folder, Settings, Search, ArrowLeft } from "lucide-react"
import type { Subject as DbSubject } from "@/lib/supabase"

interface Subject extends DbSubject {
  recordingCount?: number
  timerCount?: number
}

interface SidebarProps {
  subjects: Subject[]
  selectedSubject: Subject | null
  onSelectSubject: (subject: Subject) => void
  onAddSubject: (name: string) => void
  onBackToHome?: () => void
  newSubjectName: string
  setNewSubjectName: (name: string) => void
  isAddingSubject: boolean
  setIsAddingSubject: (value: boolean) => void
}

export default function Sidebar({
  subjects,
  selectedSubject,
  onSelectSubject,
  onAddSubject,
  onBackToHome,
  newSubjectName,
  setNewSubjectName,
  isAddingSubject,
  setIsAddingSubject,
}: SidebarProps) {
  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      onAddSubject(newSubjectName.trim())
      setNewSubjectName("")
      setIsAddingSubject(false)
    }
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          {onBackToHome && (
            <Button className="p-2 hover:bg-gray-100 bg-transparent border-0" onClick={onBackToHome}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <FileAudio className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Rozeta</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="과목 검색..." className="pl-10 bg-gray-50 border-gray-200" />
        </div>
      </div>

      {/* Subjects List */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">과목</h2>
            <Button className="h-6 w-6 p-0 bg-transparent hover:bg-gray-100" onClick={() => setIsAddingSubject(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {isAddingSubject && (
            <div className="mb-3 space-y-2">
              <Input
                placeholder="과목명 입력"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSubject()}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddSubject} className="flex-1">
                  추가
                </Button>
                <Button
                  className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsAddingSubject(false)
                    setNewSubjectName("")
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  onClick={() => onSelectSubject(subject)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedSubject?.id === subject.id
                      ? "bg-purple-50 border border-purple-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedSubject?.id === subject.id ? "bg-purple-100" : "bg-gray-100"
                      }`}
                    >
                      <Folder
                        className={`w-4 h-4 ${
                          selectedSubject?.id === subject.id ? "text-purple-600" : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          selectedSubject?.id === subject.id ? "text-purple-900" : "text-gray-900"
                        }`}
                      >
                        {subject.name}
                      </p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-gray-500">녹음 {subject.recordingCount}개</span>
                        <span className="text-xs text-gray-500">타이머 {subject.timerCount}개</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <Button className="w-full justify-start text-gray-600 bg-transparent hover:bg-gray-50">
          <Settings className="w-4 h-4 mr-2" />
          설정
        </Button>
      </div>
    </div>
  )
} 