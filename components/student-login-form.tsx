'use client'

import { FormEvent, useState } from 'react'
import { apiFetch } from '@/lib/api'

export function StudentLoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true); setError('')
    try {
      await apiFetch('/api/auth/student-login', { method: 'POST', body: JSON.stringify({ studentCode: form.get('studentCode'), pin: form.get('pin') }) })
      window.location.href = nextPath
    } catch (e) { setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  return <form className="stack" onSubmit={submit}>
    <label>รหัสนักเรียน<input name="studentCode" inputMode="text" autoComplete="username" required /></label>
    <label>PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6,}" minLength={6} autoComplete="current-password" required /></label>
    {error && <div className="message message-error" role="alert">{error}</div>}
    <button className="btn btn-primary" disabled={loading}>{loading ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบนักเรียน'}</button>
  </form>
}
