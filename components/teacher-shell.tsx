'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Classroom } from '@/types/database'

const DEFAULT_KEY = 'nfc-attendance-default-classroom'

type ClassroomContextValue = {
  classrooms: Classroom[]
  selectedId: string
  selectedClassroom: Classroom | null
  setSelectedId: (id: string) => void
  defaultId: string
  setDefaultClassroom: (id: string) => void
  reloadClassrooms: () => Promise<void>
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null)

export function useClassroom() {
  const context = useContext(ClassroomContext)
  if (!context) throw new Error('useClassroom must be used inside TeacherShell')
  return context
}

export function TeacherShell({ initialClassrooms, displayName, children }: { initialClassrooms: Classroom[]; displayName: string; children: React.ReactNode }) {
  const [classrooms, setClassrooms] = useState(initialClassrooms)
  const [selectedId, setSelectedIdState] = useState(initialClassrooms[0]?.id ?? '')
  const [defaultId, setDefaultId] = useState('')
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const stored = localStorage.getItem(DEFAULT_KEY) ?? ''
    const valid = classrooms.some((r) => r.id === stored)
    const next = valid ? stored : classrooms[0]?.id ?? ''
    setDefaultId(next)
    setSelectedIdState(next)
  }, [classrooms]) // ทำงานจริงเพียงครั้งเดียวด้วย initialized ref

  const setSelectedId = useCallback((id: string) => {
    if (!classrooms.some((r) => r.id === id)) return
    setSelectedIdState(id)
  }, [classrooms])

  const setDefaultClassroom = useCallback((id: string) => {
    if (!classrooms.some((r) => r.id === id)) return
    localStorage.setItem(DEFAULT_KEY, id)
    setDefaultId(id)
  }, [classrooms])

  const reloadClassrooms = useCallback(async () => {
    const data = await apiFetch<{ classrooms: Classroom[] }>('/api/teacher/classrooms')
    setClassrooms(data.classrooms)
    if (!data.classrooms.some((r) => r.id === selectedId)) setSelectedIdState(data.classrooms[0]?.id ?? '')
    if (!data.classrooms.some((r) => r.id === defaultId)) {
      const fallback = data.classrooms[0]?.id ?? ''
      setDefaultId(fallback)
      if (fallback) localStorage.setItem(DEFAULT_KEY, fallback)
      else localStorage.removeItem(DEFAULT_KEY)
    }
  }, [selectedId, defaultId])

  const selectedClassroom = classrooms.find((r) => r.id === selectedId) ?? null
  const value = useMemo(() => ({ classrooms, selectedId, selectedClassroom, setSelectedId, defaultId, setDefaultClassroom, reloadClassrooms }), [classrooms, selectedId, selectedClassroom, setSelectedId, defaultId, setDefaultClassroom, reloadClassrooms])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => undefined)
    window.location.href = '/'
  }

  const links = [
    ['/teacher', 'ตารางเช็กชื่อ'],
    ['/teacher/classrooms', 'จัดการห้องเรียน'],
    ['/teacher/students', 'นักเรียนและ NFC'],
    ['/teacher/materials', 'สื่อการสอน'],
    ['/teacher/teacher-nfc', 'NFC ครู'],
    ['/teacher/reports', 'รายงาน Excel'],
    ['/teacher/settings', 'ตั้งค่า'],
  ]

  return <ClassroomContext.Provider value={value}>
    <div className="teacher-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">NFC</div><div><strong>NFC Attendance</strong><div style={{fontSize: 12, opacity: .75}}>เทศบาล ๔ (เพาะชำ)</div></div></div>
        <nav className="nav" aria-label="เมนูครู">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <button onClick={logout}>ออกจากระบบ</button>
        </nav>
        <div className="sidebar-footer">เข้าสู่ระบบ: {displayName || 'ครู'}<br />ข้อมูลทุกหน้าถูกจำกัดตามสิทธิ์ห้องเรียน</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="classroom-switch">
            <strong>ห้องที่กำลังใช้งาน</strong>
            <select aria-label="เลือกห้องเรียน" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={!classrooms.length}>
              {!classrooms.length && <option value="">ยังไม่มีห้องเรียน</option>}
              {classrooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.is_active ? '' : ' (ปิด)'}</option>)}
            </select>
          </div>
          <span className="teacher-name muted">{displayName || 'ครู'}</span>
        </header>
        <nav className="mobile-nav" aria-label="เมนูมือถือ">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="content">{children}</div>
      </div>
    </div>
  </ClassroomContext.Provider>
}
