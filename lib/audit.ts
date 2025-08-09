import { supabaseAdmin } from './supabase-admin'

export async function writeAuditLog(params: {
  actor_user_id?: string | null
  actor_email?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  before?: any
  after?: any
  ip?: string | null
  user_agent?: string | null
}) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: params.actor_user_id ?? null,
      actor_email: params.actor_email ?? null,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      ip: params.ip ?? null,
      user_agent: params.user_agent ?? null,
    })
  } catch (e) {
    console.warn('audit log failed', e)
  }
}


