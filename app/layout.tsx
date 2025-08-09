import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Rozeta - AI 강의 노트",
  description: "강의 녹음을 AI가 자동으로 정리해주는 스마트 노트 서비스",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rozeta"
  },
  manifest: "/manifest.json"
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'white',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }
          }}
        />
      </body>
    </html>
  )
}
