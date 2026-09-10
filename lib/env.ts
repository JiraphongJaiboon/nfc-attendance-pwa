export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('ยังไม่ได้ตั้งค่า Supabase Public Environment Variables')
  return { url, key }
}

export function serverEnv() {
  const { url, key } = publicEnv()
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const studentEmailDomain = process.env.STUDENT_EMAIL_DOMAIN
  if (!secretKey || !siteUrl || !studentEmailDomain) {
    throw new Error('ยังไม่ได้ตั้งค่า Server Environment Variables ให้ครบ')
  }
  return { url, key, secretKey, siteUrl: siteUrl.replace(/\/$/, ''), studentEmailDomain }
}
