import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration
// Replace these with your actual Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '')
}

// Create Supabase client only if configured
let supabaseInstance: SupabaseClient | null = null

if (isSupabaseConfigured()) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = supabaseInstance

/**
 * Which schema the system-admin RBAC tables (roles, modules, role_permissions,
 * user_roles, pending_users, facilities, user_facilities) live in.
 *
 * Set via VITE_SYSTEM_ADMIN_SCHEMA at build time. Defaults to "public" for
 * backward compatibility. Must match the backend's SYSTEM_ADMIN_SCHEMA env
 * var or queries will read from the wrong schema.
 *
 * NOTE: when targeting a non-public schema, that schema MUST be added to the
 * "Exposed schemas" list in your Supabase project settings (Settings → API →
 * Exposed schemas) — otherwise PostgREST won't be reachable through
 * supabase-js for that schema.
 */
export const SYSTEM_ADMIN_SCHEMA: string =
  (import.meta.env.VITE_SYSTEM_ADMIN_SCHEMA as string | undefined) || 'public'

/**
 * Query a system-admin RBAC table in the configured schema.
 *
 * Usage:
 *   const { data } = await adminTable('roles').select('*')
 *
 * Returns the same builder shape as `supabase.from(table)`, just routed via
 * the configured schema. Returns null when Supabase isn't configured (mirrors
 * the supabase singleton's behaviour).
 */
export function adminTable(table: string) {
  if (!supabase) return null
  if (SYSTEM_ADMIN_SCHEMA === 'public') {
    return supabase.from(table)
  }
  // supabase-js typings require the schema to be in the generated Database
  // type. We're working with a runtime-configurable schema, so cast through
  // any to keep the API ergonomic. The runtime call is fully supported.
  return (supabase as unknown as {
    schema: (name: string) => { from: (t: string) => ReturnType<SupabaseClient['from']> }
  }).schema(SYSTEM_ADMIN_SCHEMA).from(table)
}

/**
 * Pull a readable message off a Supabase PostgrestError. supabase-js doesn't
 * throw `Error` instances — it returns plain objects shaped like
 * { message, details, hint, code }. `instanceof Error` is false for those,
 * which is why naive error reporters show "Unknown error".
 *
 * Usage:
 *   alert(`Failed to save: ${describeError(err)}`)
 */
export function describeError(err: unknown, fallback = 'Unknown error'): string {
  if (!err) return fallback
  if (err instanceof Error) return err.message
  const e = err as {
    message?: string
    details?: string
    hint?: string
    code?: string
  }
  if (e.message) {
    let msg = e.message
    if (e.code) msg += ` [code ${e.code}]`
    if (e.details) msg += ` — ${e.details}`
    if (e.hint) msg += ` (hint: ${e.hint})`
    return msg
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}
