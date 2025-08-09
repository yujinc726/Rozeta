import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { cookies as nextCookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function getUserAndRole(req: NextRequest): Promise<{ user: any | null; role: 'user'|'staff'|'admin'|null }>
{
  try {
    const authHeader = req.headers.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : null

    const token = bearer
      || req.cookies.get('sb-access-token')?.value
      || req.cookies.get('sb:token')?.value
      || req.cookies.get('supabase-auth-token')?.value
      || ''

    if (!supabaseUrl || !anonKey || !token) return { user: null, role: null }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, role: null }

    // Fetch own profile role under RLS
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) return { user, role: null }
    const role = (data?.role as 'user'|'staff'|'admin') || null
    return { user, role }
  } catch {
    return { user: null, role: null }
  }
}

export async function getUserAndRoleFromServerCookies(): Promise<{ user: any | null; role: 'user'|'staff'|'admin'|null }>
{
  try {
    const jar = nextCookies()
    const sbAccess = jar.get('sb-access-token')?.value
    const legacy = jar.get('supabase-auth-token')?.value
    let token = sbAccess || ''
    if (!token && legacy) {
      try {
        const parsed = JSON.parse(legacy)
        // helpers store array like ["access_token","refresh_token",...]
        if (Array.isArray(parsed) && parsed.length > 0) {
          token = parsed[0]
        } else if (parsed?.currentSession?.access_token) {
          token = parsed.currentSession.access_token
        }
      } catch {}
    }
    if (!supabaseUrl || !anonKey || !token) return { user: null, role: null }
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, role: null }
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (error) return { user, role: null }
    const role = (data?.role as 'user'|'staff'|'admin') || null
    return { user, role }
  } catch {
    return { user: null, role: null }
  }
}


