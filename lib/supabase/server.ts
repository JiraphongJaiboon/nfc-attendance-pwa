import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  const { url, key } = publicEnv()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components บางบริบทเขียน cookie ไม่ได้; proxy.ts จะดูแล refresh session
        }
      },
    },
  })
}
