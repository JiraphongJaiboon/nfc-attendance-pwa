import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/env'

export function createAdminSupabase() {
  const { url, secretKey } = serverEnv()
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
