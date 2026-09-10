import type { LearningMaterial, LearningMaterialType } from '@/types/database'

export const MATERIAL_TYPES: { value: LearningMaterialType; label: string }[] = [
  { value: 'video', label: 'วิดีโอ' },
  { value: 'image', label: 'รูปภาพ' },
  { value: 'slide', label: 'สไลด์ / เอกสาร' },
  { value: 'link', label: 'ลิงก์' },
]

export function materialTypeLabel(type: LearningMaterialType) {
  return MATERIAL_TYPES.find((item) => item.value === type)?.label ?? type
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function safeFileName(name: string) {
  const clean = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return clean.slice(0, 120) || 'file'
}

export function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value)
    return ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'].includes(url.hostname)
  } catch {
    return false
  }
}

export function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value)
    let id = ''
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1)
    else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] ?? ''
    else id = url.searchParams.get('v') ?? ''
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null
  } catch {
    return null
  }
}

export function canPreviewInline(material: LearningMaterial) {
  if (!material.view_url) return false
  if (material.material_type === 'image') return true
  if (material.material_type === 'video') return true
  return material.mime_type === 'application/pdf'
}
