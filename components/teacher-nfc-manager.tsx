'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { thaiDateTime } from '@/lib/utils'
import type { TeacherNfcStatus } from '@/types/database'

export function TeacherNfcManager() {
  const [status, setStatus] = useState<TeacherNfcStatus>({ active: false, issued_at: null, last_used_at: null })
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try { setStatus(await apiFetch<TeacherNfcStatus>('/api/teacher/teacher-nfc')) }
    catch (err) { setError(err instanceof Error ? err.message : 'โหลดสถานะ NFC ครูไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function issue() {
    if (!confirm('สร้าง NFC ครูใหม่?\nหากมีแท็กเดิม แท็กเดิมจะถูกยกเลิกทันที')) return
    setLoading(true)
    try {
      const data = await apiFetch<{ url: string }>('/api/teacher/teacher-nfc', { method: 'POST' })
      setUrl(data.url)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'สร้าง NFC ครูไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  async function revoke() {
    if (!confirm('ยกเลิก NFC ครูปัจจุบัน? หลังยกเลิกแท็กนี้จะเข้าสู่ระบบไม่ได้ทันที')) return
    setLoading(true)
    try { await apiFetch('/api/teacher/teacher-nfc', { method: 'DELETE' }); setUrl(''); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'ยกเลิก NFC ครูไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  return <>
    <div className="header-row"><div><h1 className="page-title">NFC สำหรับครู</h1><p className="page-subtitle">แตะแท็กแล้วเข้าสู่ระบบครูโดยไม่ต้องกรอกรหัสผ่าน</p></div></div>
    <div className="message message-error"><strong>สำคัญ:</strong> NFC ครูเปรียบเสมือนกุญแจเข้าระบบ ผู้ที่ถือแท็กสามารถเข้าสู่บัญชีครูได้ หากแท็กหายให้เข้าระบบด้วยอีเมล/รหัสผ่านแล้วกด “ยกเลิก NFC ครู” ทันที</div>
    {error && <div className="message message-error" style={{ marginTop: 12 }}>{error}</div>}
    <section className="card stack" style={{ marginTop: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>สถานะแท็กครู</h2><span className={`badge ${status.active ? 'badge-green' : 'badge-gray'}`}>{status.active ? 'มีแท็กที่ใช้งานอยู่' : 'ยังไม่มีแท็ก'}</span></div>
      {status.issued_at && <p className="muted">ออกแท็กเมื่อ {thaiDateTime(status.issued_at)}</p>}
      {status.last_used_at && <p className="muted">ใช้งานล่าสุด {thaiDateTime(status.last_used_at)}</p>}
      <div className="row"><button className="btn btn-primary" onClick={issue} disabled={loading}>{status.active ? 'ออก NFC ครูใหม่' : 'สร้าง NFC ครู'}</button>{status.active && <button className="btn btn-danger" onClick={revoke} disabled={loading}>ยกเลิก NFC ครู</button>}</div>
    </section>
    {url && <div className="modal-backdrop" role="dialog"><div className="modal stack"><h2 style={{ margin: 0 }}>URL สำหรับเขียนลง NFC ครู</h2><div className="message message-success">คัดลอก URL นี้ทันที ระบบฐานข้อมูลเก็บเฉพาะ SHA-256 hash</div><div className="code-box">{url}</div><div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={async () => { await navigator.clipboard.writeText(url); alert('คัดลอกแล้ว') }}>คัดลอก URL</button><button className="btn btn-secondary" onClick={() => setUrl('')}>ปิด</button></div></div></div>}
  </>
}
