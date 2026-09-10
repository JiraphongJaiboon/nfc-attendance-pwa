'use client'

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createBrowserSupabase() {
  if (!browserClient) {
    const { url, key } = publicEnv()
    browserClient = createBrowserClient(url, key)
  }
  return browserClient
}
