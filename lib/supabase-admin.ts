import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Supabase admin client missing env. URL or SERVICE ROLE KEY not set.')
}

export const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', serviceRoleKey || 'placeholder-key', {
  auth: { persistSession: false, autoRefreshToken: false }
})


