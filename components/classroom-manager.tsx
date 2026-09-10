'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useClassroom } from '@/components/teacher-shell'
import { apiFetch } from '@/lib/api'
import { thaiDate } from '@/lib/utils'
import type { Classroom } from '@/types/database'

export function ClassroomManager() {
  const { classrooms, selectedId, setSelectedId, reloadClassrooms } = useClassroom()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { void reloadClassrooms().catch(() => undefined) }, [reloadClassrooms])

  async function createRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('')
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    try {
      const result = await apiFetch<{ classroom: Classroom }>('/api/teacher/classrooms', { method:'POST', body: JSON.stringify({ name: form.get('name') }) })
      formElement.reset(); await reloadClassrooms(); setSelectedId(result.classroom.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'สร้างห้องไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  async function rename(room: Classroom) {
    const name = prompt('ชื่อห้องใหม่', room.name)?.trim()
    if (!name || name === room.name) return
    try { await apiFetch(`/api/teacher/classrooms/${room.id}`, { method:'PATCH', body: JSON.stringify({ name }) }); await reloadClassrooms() }
    catch (e) { alert(e instanceof Error ? e.message : 'เปลี่ยนชื่อไม่สำเร็จ') }
  }
  async function toggle(room: Classroom) {
    if (!confirm(`${room.is_active ? 'ปิด' : 'เปิด'}ใช้งานห้อง “${room.name}” ?\nการปิดห้องจะไม่ลบข้อมูลเดิม แต่จะสร้างรอบใหม่และเช็กชื่อไม่ได้จนกว่าจะเปิดอีกครั้ง`)) return
    try { await apiFetch(`/api/teacher/classrooms/${room.id}`, { method:'PATCH', body: JSON.stringify({ is_active: !room.is_active }) }); await reloadClassrooms() }
    catch (e) { alert(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ') }
  }

  return <>
    <div className="header-row"><div><h1 className="page-title">จัดการห้องเรียน</h1><p className="page-subtitle">แต่ละห้องมีรายชื่อ รอบเช็กชื่อ ตารางวันที่ และรายงานแยกจากกัน</p></div></div>
    <div className="grid-2">
      <section className="card"><h2 style={{marginTop:0}}>สร้างห้องใหม่</h2><form className="row" onSubmit={createRoom}><label className="grow">ชื่อห้อง เช่น ป.1/1<input name="name" required maxLength={100} /></label><button className="btn btn-primary" disabled={loading}>{loading ? 'กำลังสร้าง…':'สร้างห้อง'}</button></form>{error && <div className="message message-error" style={{marginTop:12}}>{error}</div>}</section>
      <section className="card"><h2 style={{marginTop:0}}>หลักการแยกข้อมูล</h2><p className="muted">การสลับห้องจะโหลดข้อมูลใหม่เฉพาะห้องนั้น และ RLS จะตรวจสิทธิ์อีกชั้นที่ฐานข้อมูล การแก้ URL หรือ Request ไม่ทำให้เห็นห้องที่ไม่มีสิทธิ์</p></section>
    </div>
    <section className="card" style={{marginTop:14}}><div className="row" style={{justifyContent:'space-between'}}><h2 style={{margin:0}}>ห้องที่มีสิทธิ์จัดการ</h2><span className="badge badge-gray">{classrooms.length} ห้อง</span></div>
      <div className="list" style={{marginTop:14}}>{classrooms.length ? classrooms.map((room) => <div className="list-item" key={room.id} style={{borderColor: selectedId === room.id ? 'var(--orange)' : undefined}}>
        <div><strong>{room.name}</strong> <span className={`badge ${room.is_active ? 'badge-green':'badge-red'}`}>{room.is_active ? 'เปิดใช้งาน':'ปิดใช้งาน'}</span><div className="muted" style={{marginTop:5}}>นักเรียน {room.student_count ?? 0} คน · รอบล่าสุด {room.latest_session_date ? thaiDate(room.latest_session_date, false) : 'ยังไม่มีรอบ'}</div></div>
        <div className="row"><button className="btn btn-secondary btn-sm" onClick={() => setSelectedId(room.id)}>เลือกห้องนี้</button><button className="btn btn-secondary btn-sm" onClick={() => rename(room)}>เปลี่ยนชื่อ</button><button className={`btn btn-sm ${room.is_active ? 'btn-danger':'btn-primary'}`} onClick={() => toggle(room)}>{room.is_active ? 'ปิดห้อง':'เปิดห้อง'}</button></div>
      </div>) : <div className="empty">ยังไม่มีห้องเรียน</div>}</div>
      <p className="muted" style={{marginBottom:0}}>ระบบไม่แสดงปุ่มลบห้องที่มีข้อมูล เพื่อลดความเสี่ยงต่อประวัติการเช็กชื่อ หากต้องการยุบห้องให้ปิดใช้งานแทน ข้อมูลเดิมจะยังอยู่ครบ</p>
    </section>
  </>
}
