'use client'

import { FormEvent, useState } from 'react'
import { apiFetch } from '@/lib/api'

export function TeacherLoginForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true); setError('')
    try {
      await apiFetch('/api/auth/teacher-login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) })
      window.location.href = '/teacher'
    } catch (e) { setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  return <form className="stack" onSubmit={submit}>
    <label>อีเมลครู<input name="email" type="email" autoComplete="email" required placeholder="teacher@school.ac.th" /></label>
    <label>รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <div className="message message-error" role="alert">{error}</div>}
    <button className="btn btn-primary" disabled={loading}>{loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบครู'}</button>
  </form>
}
