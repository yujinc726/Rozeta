import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // 클라이언트 가드는 layout에서 진행 중. 서버 가드는 간단 체크: 세션 쿠키 유무
  // 더 강한 검증은 server action 또는 RLS로 처리. 여기서는 최소한의 보호.
  const hasAuth = req.cookies.get('sb-access-token') || req.cookies.get('sb:token') || req.cookies.get('supabase-auth-token')
  if (!hasAuth) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}


