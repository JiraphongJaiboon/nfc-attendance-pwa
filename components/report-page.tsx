'use client'

import { useState } from 'react'
import { useClassroom } from '@/components/teacher-shell'
import { bangkokDateNow } from '@/lib/utils'

export function ReportPage() {
  const { selectedId, selectedClassroom } = useClassroom()
  const today = bangkokDateNow()
  const [from, setFrom] = useState(`${today.slice(0,7)}-01`)
  const [to, setTo] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [downloading, setDownloading] = useState(false)

  async function download() {
    if (!selectedId || from > to) return
    setDownloading(true)
    try {
      const url = `/api/teacher/export?classroomId=${encodeURIComponent(selectedId)}&from=${from}&to=${to}&selectedDate=${selectedDate}`
      const response = await fetch(url, { cache:'no-store' })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'ส่งออกรายงานไม่สำเร็จ') }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/)
      const filename = match ? decodeURIComponent(match[1]) : `NFC-Attendance-${selectedClassroom?.name ?? 'class'}.xlsx`
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = objectUrl; a.download = filename; a.click(); URL.revokeObjectURL(objectUrl)
    } catch (e) { alert(e instanceof Error ? e.message : 'ส่งออกไม่สำเร็จ') }
    finally { setDownloading(false) }
  }

  if (!selectedClassroom) return <div className="card empty">กรุณาสร้างและเลือกห้องเรียนก่อนส่งออกรายงาน</div>
  return <>
    <div className="header-row"><div><h1 className="page-title">รายงาน Excel — {selectedClassroom.name}</h1><p className="page-subtitle">ส่งออกเฉพาะห้องที่กำลังเลือก และใช้หัวตาราง/วันที่ภาษาไทย</p></div></div>
    <section className="card stack"><div className="grid-3"><label>เริ่มวันที่<input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>ถึงวันที่<input type="date" min={from} value={to} onChange={e=>setTo(e.target.value)} /></label><label>วันที่สำหรับ Sheet รายละเอียด<input type="date" min={from} max={to} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} /></label></div><button className="btn btn-primary" onClick={download} disabled={downloading || from>to}>{downloading?'กำลังสร้างไฟล์…':`ส่งออก .xlsx ห้อง ${selectedClassroom.name}`}</button></section>
    <section className="card" style={{marginTop:14}}><h2 style={{marginTop:0}}>ไฟล์ประกอบด้วย 5 Sheet</h2><ol className="stack"><li>สรุปการเช็กชื่อแยกตามวันที่</li><li>ตารางรายชื่อนักเรียนแบบแถวต่อคนและคอลัมน์ต่อวันที่</li><li>รายละเอียดนักเรียนทั้งหมดของวันที่เลือก พร้อมสถานะและเวลา</li><li>รายชื่อนักเรียนที่ยังไม่เช็กชื่อแยกตามวันที่</li><li>ข้อมูลห้องเรียนและช่วงวันที่ของรายงาน</li></ol><p className="muted">สถานะใช้ ✓ / สาย / – / ปิด / ไม่มีรอบ / ถูกระงับ ตามข้อมูลของห้องนี้เท่านั้น</p></section>
  </>
}
