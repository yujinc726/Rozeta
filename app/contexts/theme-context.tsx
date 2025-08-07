"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { settingsDb } from '@/lib/database'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark' // 실제 적용된 테마 (system일 때 해결된 값)
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // 시스템 테마 감지
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  // 실제 테마 계산
  const calculateActualTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme()
    }
    return currentTheme
  }

  // 테마 적용
  const applyTheme = (newTheme: Theme) => {
    const resolved = calculateActualTheme(newTheme)
    setActualTheme(resolved)
    
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      
      // 메타 태그 업데이트 (상태바 색상 등)
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolved === 'dark' ? '#1f2937' : '#ffffff')
      }
    }
  }

  // 테마 설정 및 저장
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    
    // 데이터베이스에 저장
    try {
      const existingSettings = await settingsDb.get() || {}
      await settingsDb.update({
        ...existingSettings,
        theme: {
          mode: newTheme
        }
      })
    } catch (error) {
      console.error('Failed to save theme setting:', error)
    }
  }

  // 다크/라이트 토글
  const toggleTheme = () => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // 초기 테마 로드
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await settingsDb.get()
        const savedTheme = settings?.theme?.mode as Theme || 'system'
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      } catch (error) {
        console.error('Failed to load theme setting:', error)
        // 기본값으로 시스템 테마 사용
        setThemeState('system')
        applyTheme('system')
      }
    }

    loadTheme()
  }, [])

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const value = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
