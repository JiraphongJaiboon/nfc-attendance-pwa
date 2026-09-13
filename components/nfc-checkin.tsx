'use client'

import { useEffect, useRef, useState } from 'react'
import { thaiDateTime } from '@/lib/utils'

type Result = { ok: boolean; code: string; message: string; status?: 'present' | 'late'; checked_at?: string; classroom_name?: string; session_date?: string }

export function NfcCheckin({ token }: { token: string }) {
  const called = useRef(false)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (called.current) return
    called.current = true
    ;(async () => {
      try {
        const response = await fetch('/api/nfc/check-in', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store',
        })
        const data = await response.json()
        setResult(data)
      } catch { setResult({ ok: false, code: 'NETWORK_ERROR', message: 'ระบบหรือเครือข่ายขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตแล้วแตะแท็กใหม่' }) }
      finally { setLoading(false) }
    })()
  }, [token])

  if (loading) return <div className="stack" style={{textAlign: 'center'}}><div className="brand-mark" style={{margin: '0 auto'}}>NFC</div><h1>กำลังตรวจสอบการเช็กชื่อ…</h1><p className="muted">ระบบใช้เวลาจากเซิร์ฟเวอร์ ไม่ใช้เวลาจากโทรศัพท์</p></div>
const success = result?.ok
const canViewMaterials = true
  return <div className="stack" style={{textAlign: 'center'}}>
    <div className="brand-mark" style={{margin: '0 auto', background: success ? 'var(--green)' : 'var(--red)'}}>{success ? '✓' : '!'}</div>
    <h1 className="brand-title">{success ? (result.status === 'late' ? 'เช็กชื่อสำเร็จ — มาสาย' : 'เช็กชื่อสำเร็จ') : 'ไม่สามารถเช็กชื่อได้'}</h1>
    <div className={`message ${success ? 'message-success' : 'message-error'}`}>{result?.message}</div>
    {result?.classroom_name && <p><strong>ห้อง:</strong> {result.classroom_name}</p>}
    {result?.checked_at && <p><strong>เวลา:</strong> {thaiDateTime(result.checked_at)}</p>}
    {result?.code === 'ALREADY_CHECKED' && result.checked_at && <p className="muted">รายการเดิมยังคงอยู่ ระบบไม่ได้สร้างข้อมูลซ้ำ</p>}
    <div className="row" style={{ justifyContent: 'center' }}>
      {canViewMaterials && <a className="btn btn-primary" href="/student/materials">ดูสื่อการสอนของห้อง</a>}
      <a className="btn btn-orange" href="/student/game">เล่นเกมการเขียนภาพฉาย</a>
    </div>
    <p className="muted">สามารถปิดหน้านี้ได้ หรือเปิดสื่อการสอนที่ครูเตรียมไว้</p>
  </div>
}
