'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MaterialPreview } from '@/components/material-manager'
import { materialTypeLabel } from '@/lib/media'
import type { LearningMaterial } from '@/types/database'

export function StudentMaterials() {
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [classroomName, setClassroomName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const response = await fetch('/api/student/materials', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'โหลดสื่อไม่สำเร็จ')
        setMaterials(data.materials ?? [])
        setClassroomName(data.classroom?.name ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'โหลดสื่อไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="loading">กำลังโหลดสื่อการสอน…</div>
  if (error) return <div className="message message-error">{error}</div>

  return <div className="stack">
    <div><h1 className="page-title">สื่อการสอน {classroomName ? `— ${classroomName}` : ''}</h1><p className="page-subtitle">เนื้อหาที่ครูเผยแพร่สำหรับห้องของคุณ ดูได้โดยไม่ต้องรอเปิดรอบเช็กชื่อ</p></div>
    <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}><Link className="btn btn-primary" href="/student/lab">🧊 ห้องทดลอง 3D + มินิเกม</Link><span className="badge badge-green">คะแนนเกมบันทึกใน Supabase</span></div>
    {materials.length ? <div className="media-grid">
      {materials.map((material) => <article className="media-card" key={material.id}>
        <MaterialPreview material={material} />
        <div className="media-card-body stack">
          <span className="badge badge-orange" style={{ width: 'fit-content' }}>{materialTypeLabel(material.material_type)}</span>
          <div><h2 style={{ margin: 0, fontSize: 20 }}>{material.title}</h2>{material.description && <p className="muted" style={{ whiteSpace: 'pre-line' }}>{material.description}</p>}</div>
          {material.material_type === 'slide'
            ? <Link className="btn btn-primary" href={`/student/slides/${material.id}`}>เลื่อนอ่านสไลด์ในเว็บ</Link>
            : material.view_url && <a className="btn btn-primary" href={material.view_url} target="_blank" rel="noreferrer">เปิดสื่อเต็มหน้าจอ</a>}
        </div>
      </article>)}
    </div> : <div className="card empty">ครูยังไม่ได้เผยแพร่สื่อการสอนสำหรับห้องนี้</div>}
  </div>
}
