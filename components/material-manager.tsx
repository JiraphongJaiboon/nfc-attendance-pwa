'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useClassroom } from '@/components/teacher-shell'
import { apiFetch } from '@/lib/api'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { materialTypeLabel, youtubeEmbedUrl } from '@/lib/media'
import type { LearningMaterial, LearningMaterialType } from '@/types/database'

type SourceMode = 'url' | 'file'

export function MaterialManager() {
  const { selectedId, selectedClassroom } = useClassroom()
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sourceMode, setSourceMode] = useState<SourceMode>('url')
  const [materialType, setMaterialType] = useState<LearningMaterialType>('video')

  const load = useCallback(async () => {
    if (!selectedId) { setMaterials([]); return }
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ materials: LearningMaterial[] }>(`/api/teacher/materials?classroomId=${encodeURIComponent(selectedId)}`)
      setMaterials(data.materials)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดสื่อการสอนไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { void load() }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId || !selectedClassroom) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setLoading(true)
    setError('')

    try {
      let storagePath = ''
      let originalFileName = ''
      let mimeType = ''
      let externalUrl = ''

      if (sourceMode === 'file') {
        const file = form.get('file')
        if (!(file instanceof File) || !file.size) throw new Error('กรุณาเลือกไฟล์')

        const signed = await apiFetch<{ path: string; token: string }>('/api/teacher/materials/upload-url', {
          method: 'POST',
          body: JSON.stringify({
            classroomId: selectedId,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            materialType,
          }),
        })

        const supabase = createBrowserSupabase()
        const { error: uploadError } = await supabase.storage
          .from('teaching-media')
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type })
        if (uploadError) throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${uploadError.message}`)

        storagePath = signed.path
        originalFileName = file.name
        mimeType = file.type
      } else {
        externalUrl = String(form.get('externalUrl') ?? '').trim()
      }

      await apiFetch('/api/teacher/materials', {
        method: 'POST',
        body: JSON.stringify({
          classroomId: selectedId,
          title: form.get('title'),
          description: form.get('description'),
          materialType,
          externalUrl,
          storagePath,
          originalFileName,
          mimeType,
          sortOrder: Number(form.get('sortOrder') ?? 0),
          isPublished: form.get('isPublished') === 'on',
        }),
      })

      formElement.reset()
      setSourceMode('url')
      setMaterialType('video')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มสื่อไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function edit(material: LearningMaterial) {
    const title = prompt('ชื่อสื่อ', material.title)?.trim()
    if (!title) return
    const description = prompt('คำอธิบาย', material.description) ?? material.description
    let externalUrl: string | undefined
    if (material.external_url) {
      const value = prompt('URL สื่อ', material.external_url)?.trim()
      if (!value) return
      externalUrl = value
    }
    try {
      await apiFetch(`/api/teacher/materials/${material.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description, ...(externalUrl ? { externalUrl } : {}) }),
      })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'แก้ไขสื่อไม่สำเร็จ')
    }
  }

  async function togglePublish(material: LearningMaterial) {
    try {
      await apiFetch(`/api/teacher/materials/${material.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !material.is_published }),
      })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    }
  }

  async function remove(material: LearningMaterial) {
    if (!confirm(`ลบสื่อ “${material.title}” ?\nถ้าเป็นไฟล์อัปโหลด ไฟล์ใน Storage จะถูกลบด้วย`)) return
    try {
      await apiFetch(`/api/teacher/materials/${material.id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบสื่อไม่สำเร็จ')
    }
  }

  if (!selectedClassroom) return <div className="card empty">กรุณาสร้างและเลือกห้องเรียนก่อนเพิ่มสื่อการสอน</div>

  return <>
    <div className="header-row">
      <div>
        <h1 className="page-title">สื่อการสอน — {selectedClassroom.name}</h1>
        <p className="page-subtitle">นักเรียนในห้องนี้จะเห็นเฉพาะรายการที่ครูเปิดเผยแพร่</p>
      </div>
    </div>

    {error && <div className="message message-error">{error}</div>}
    {!selectedClassroom.is_active && <div className="message message-error">ห้องนี้ปิดใช้งานอยู่ สื่อเดิมยังเก็บไว้แต่ไม่ควรเพิ่มสื่อใหม่จนกว่าจะเปิดห้อง</div>}

    <section className="card" style={{ marginTop: 14 }}>
      <h2 style={{ marginTop: 0 }}>เพิ่มสื่อการสอน</h2>
      <form className="stack" onSubmit={submit}>
        <div className="grid-2">
          <label>ชื่อสื่อ<input name="title" required maxLength={200} placeholder="เช่น การเขียนภาพฉาย บทที่ 1" /></label>
          <label>ประเภทสื่อ
            <select value={materialType} onChange={(e) => { const next = e.target.value as LearningMaterialType; setMaterialType(next); if (next === 'link') setSourceMode('url') }}>
              <option value="video">วิดีโอ</option>
              <option value="image">รูปภาพ</option>
              <option value="slide">สไลด์ / เอกสาร</option>
              <option value="link">ลิงก์</option>
            </select>
          </label>
        </div>
        <label>คำอธิบาย<textarea name="description" rows={3} placeholder="อธิบายเนื้อหาหรือคำแนะนำให้นักเรียน" /></label>
        <div className="grid-2">
          <label>แหล่งสื่อ
            <select value={sourceMode} onChange={(e) => setSourceMode(e.target.value as SourceMode)}>
              <option value="url">ใช้ลิงก์ URL</option>
              <option value="file" disabled={materialType === 'link'}>อัปโหลดไฟล์</option>
            </select>
          </label>
          <label>ลำดับการแสดง<input name="sortOrder" type="number" defaultValue={0} /></label>
        </div>
        {sourceMode === 'url'
          ? <label>URL<input name="externalUrl" type="url" required placeholder="https://... เช่น YouTube, Google Slides, Canva, Drive" /></label>
          : <label>เลือกไฟล์<input name="file" type="file" required accept={materialType === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : materialType === 'video' ? 'video/mp4,video/webm,video/quicktime' : '.pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'} /></label>}
        <label className="check-label"><input name="isPublished" type="checkbox" defaultChecked /> เผยแพร่ให้นักเรียนเห็นทันที</label>
        <div className="message message-success">วิดีโอขนาดใหญ่แนะนำให้อัปโหลด YouTube หรือ Google Drive แล้วใช้ URL ส่วนรูปภาพและไฟล์สไลด์สามารถอัปโหลดตรงเข้า Supabase Storage ได้</div>
        <button className="btn btn-primary" disabled={loading || !selectedClassroom.is_active}>{loading ? 'กำลังบันทึก…' : `เพิ่มสื่อให้ห้อง ${selectedClassroom.name}`}</button>
      </form>
    </section>

    <section className="card" style={{ marginTop: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>สื่อของห้องนี้</h2><span className="badge badge-gray">{materials.length} รายการ</span></div>
      {loading && !materials.length ? <div className="loading">กำลังโหลด…</div> : materials.length ? <div className="media-grid" style={{ marginTop: 14 }}>
        {materials.map((material) => <article className="media-card" key={material.id}>
          <MaterialPreview material={material} />
          <div className="media-card-body stack">
            <div className="row"><span className="badge badge-orange">{materialTypeLabel(material.material_type)}</span><span className={`badge ${material.is_published ? 'badge-green' : 'badge-gray'}`}>{material.is_published ? 'เผยแพร่' : 'ซ่อน'}</span></div>
            <div><h3 style={{ margin: 0 }}>{material.title}</h3>{material.description && <p className="muted" style={{ whiteSpace: 'pre-line' }}>{material.description}</p>}</div>
            <div className="row">
              {material.view_url && <a className="btn btn-secondary btn-sm" href={material.view_url} target="_blank" rel="noreferrer">เปิดสื่อ</a>}
              <button className="btn btn-secondary btn-sm" onClick={() => edit(material)}>แก้ไข</button>
              <button className="btn btn-ghost btn-sm" onClick={() => togglePublish(material)}>{material.is_published ? 'ซ่อนจากนักเรียน' : 'เผยแพร่'}</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(material)}>ลบ</button>
            </div>
          </div>
        </article>)}
      </div> : <div className="empty">ยังไม่มีสื่อการสอนในห้อง {selectedClassroom.name}</div>}
    </section>
  </>
}

export function MaterialPreview({ material }: { material: LearningMaterial }) {
  if (!material.view_url) return <div className="media-placeholder">ไม่มีตัวอย่าง</div>
  const yt = material.material_type === 'video' ? youtubeEmbedUrl(material.view_url) : null
  if (yt) return <iframe className="media-preview" src={yt} title={material.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
  if (material.material_type === 'image') return <img className="media-preview" src={material.view_url} alt={material.title} />
  if (material.material_type === 'video' && material.storage_path) return <video className="media-preview" controls preload="metadata" src={material.view_url} />
  if (material.mime_type === 'application/pdf') return <iframe className="media-preview" src={material.view_url} title={material.title} />
  return <div className="media-placeholder">{materialTypeLabel(material.material_type)}</div>
}
