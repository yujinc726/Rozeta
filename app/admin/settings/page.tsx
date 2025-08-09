"use client"

import { useState } from "react"

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState({
    enableNewAI: false,
    limitFreeUsers: false,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">시스템 설정</h1>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">신규 AI 모델 베타</div>
            <div className="text-xs text-gray-500">일부 사용자에게만 롤아웃</div>
          </div>
          <input type="checkbox" checked={flags.enableNewAI} onChange={(e) => setFlags(v => ({...v, enableNewAI: e.target.checked}))} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">무료 사용자 제한</div>
            <div className="text-xs text-gray-500">월간 처리량 제한 적용</div>
          </div>
          <input type="checkbox" checked={flags.limitFreeUsers} onChange={(e) => setFlags(v => ({...v, limitFreeUsers: e.target.checked}))} />
        </div>
        <div className="text-xs text-gray-500">실제 저장은 서버 API 연결 이후 활성화합니다.</div>
      </div>
    </div>
  )
}


