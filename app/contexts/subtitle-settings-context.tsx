"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { settingsDb } from '@/lib/database'

interface SubtitleSettings {
  maxWords: number
  fontSize: number
  backgroundColor: string
  backgroundOpacity: number
  textColor: string
}

const defaultSettings: SubtitleSettings = {
  maxWords: 12,
  fontSize: 18,
  backgroundColor: '#000000',
  backgroundOpacity: 75,
  textColor: '#ffffff'
}

interface SubtitleSettingsContextType {
  settings: SubtitleSettings
  loading: boolean
  updateSettings: (newSettings: Partial<SubtitleSettings>) => void
  resetToDefaults: () => void
  saveSettings: () => Promise<void>
}

const SubtitleSettingsContext = createContext<SubtitleSettingsContextType | undefined>(undefined)

export function SubtitleSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SubtitleSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  const loadSettings = async () => {
    try {
      const userSettings = await settingsDb.get()
      if (userSettings?.subtitles) {
        setSettings({
          maxWords: userSettings.subtitles.max_words ?? defaultSettings.maxWords,
          fontSize: userSettings.subtitles.font_size ?? defaultSettings.fontSize,
          backgroundColor: userSettings.subtitles.background_color ?? defaultSettings.backgroundColor,
          backgroundOpacity: userSettings.subtitles.background_opacity ?? defaultSettings.backgroundOpacity,
          textColor: userSettings.subtitles.text_color ?? defaultSettings.textColor
        })
      }
    } catch (error) {
      console.warn('Failed to load subtitle settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = (newSettings: Partial<SubtitleSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
  }

  const saveSettings = async () => {
    try {
      // 다른 설정들도 함께 저장하기 위해 기존 설정을 가져옴
      const existingSettings = await settingsDb.get() || {}
      
      const updatedSettings = {
        ...existingSettings,
        subtitles: {
          max_words: settings.maxWords,
          font_size: settings.fontSize,
          background_color: settings.backgroundColor,
          background_opacity: settings.backgroundOpacity,
          text_color: settings.textColor
        }
      }
      
      await settingsDb.update(updatedSettings)
    } catch (error) {
      console.error('Failed to save subtitle settings:', error)
      throw error
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const value = {
    settings,
    loading,
    updateSettings,
    resetToDefaults,
    saveSettings
  }

  return (
    <SubtitleSettingsContext.Provider value={value}>
      {children}
    </SubtitleSettingsContext.Provider>
  )
}

export function useSubtitleSettings() {
  const context = useContext(SubtitleSettingsContext)
  if (context === undefined) {
    throw new Error('useSubtitleSettings must be used within a SubtitleSettingsProvider')
  }
  return context
}
