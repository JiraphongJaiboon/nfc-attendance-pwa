'use client'

import { useState } from 'react'
import { useClassroom } from '@/components/teacher-shell'

export function SettingsPage() {
  const { classrooms, selectedId, defaultId, setDefaultClassroom } = useClassroom()
  const [installMessage, setInstallMessage] = useState('')
  const selected = classrooms.find(r=>r.id===selectedId)
  function makeDefault() {
    if (!selectedId) return
    setDefaultClassroom(selectedId)
    setInstallMessage(`ตั้ง ${selected?.name ?? 'ห้องนี้'} เป็นห้องเริ่มต้นบนอุปกรณ์นี้แล้ว`)
  }
  return <>
    <div className="header-row"><div><h1 className="page-title">ตั้งค่า</h1><p className="page-subtitle">การตั้งค่าหน้าเว็บและ PWA</p></div></div>
    <div className="grid-2">
      <section className="card stack"><h2 style={{margin:0}}>ห้องเริ่มต้น</h2><p className="muted">เมื่อเข้าสู่ระบบครูครั้งถัดไปบนอุปกรณ์นี้ ระบบจะเลือกห้องที่กำหนดไว้ก่อน โดยยังตรวจสิทธิ์จากฐานข้อมูลทุกครั้ง</p><div>ห้องเริ่มต้นปัจจุบัน: <strong>{classrooms.find(r=>r.id===defaultId)?.name ?? 'ยังไม่ได้กำหนด'}</strong></div><button className="btn btn-primary" onClick={makeDefault} disabled={!selectedId}>ตั้ง “{selected?.name ?? '-'}” เป็นห้องเริ่มต้น</button>{installMessage&&<div className="message message-success">{installMessage}</div>}</section>
      <section className="card stack"><h2 style={{margin:0}}>ติดตั้งเป็น PWA</h2><p className="muted">Android/Chrome: เปิดเมนูเบราว์เซอร์แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก” · iPhone/Safari: กด Share แล้วเลือก “Add to Home Screen”</p><div className="message message-error">การเช็กชื่อ NFC ต้องมีอินเทอร์เน็ตเสมอ Service Worker จะไม่ Cache Auth, API, NFC check-in หรือข้อมูลแดชบอร์ด</div></section>
    </div>
    <section className="card" style={{marginTop:14}}><h2 style={{marginTop:0}}>ความปลอดภัยที่ใช้ในระบบ</h2><div className="grid-2"><div>✓ RLS แยกสิทธิ์ห้องเรียนที่ฐานข้อมูล</div><div>✓ Secret key อยู่เฉพาะ Server Route</div><div>✓ NFC เก็บเฉพาะ SHA-256 hash</div><div>✓ เวลาเช็กชื่อใช้เวลาจากฐานข้อมูล</div><div>✓ Realtime กรอง classroom_id และผ่าน RLS</div><div>✓ นักเรียนเลือกห้อง/วันที่/รอบจาก Client ไม่ได้</div></div></section>
  </>
}
