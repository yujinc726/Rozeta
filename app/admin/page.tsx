"use client"

import { useEffect, useState } from 'react'

export default function AdminHome() {
  const [metrics, setMetrics] = useState<{ totalUsers: number; totalRecordings: number; storageUsedBytes: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/admin/metrics', { cache: 'no-store' })
        const data = await res.json()
        if (mounted) setMetrics(data)
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const units = ['B','KB','MB','GB','TB']
    let i = 0
    let v = bytes
    while (v >= 1024 && i < units.length-1) { v /= 1024; i++ }
    return `${v.toFixed(1)} ${units[i]}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">총 사용자</div>
          <div className="mt-2 text-2xl font-bold">{loading ? '—' : (metrics?.totalUsers ?? 0)}</div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">총 녹음</div>
          <div className="mt-2 text-2xl font-bold">{loading ? '—' : (metrics?.totalRecordings ?? 0)}</div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">스토리지 사용량</div>
          <div className="mt-2 text-2xl font-bold">{loading ? '—' : formatBytes(metrics?.storageUsedBytes || 0)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-500 mb-2">활동 추이</div>
          <div className="text-sm text-gray-400 text-center py-8">차트 구현 예정</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-500 mb-2">활성 사용자</div>
          <div className="text-sm text-gray-400 text-center py-8">사용자 순위 구현 예정</div>
        </div>
      </div>
    </div>
  )
}


