export type UserRole = 'teacher' | 'student'
export type AttendanceStatus = 'present' | 'late'
export type NfcStatus = 'active' | 'revoked'

export interface Classroom {
  id: string
  teacher_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  student_count?: number
  latest_session_date?: string | null
}

export interface Student {
  id: string
  classroom_id: string
  student_code: string
  number: number
  prefix: string
  first_name: string
  last_name: string
  active: boolean
  created_at: string
  updated_at: string
  nfc_status?: NfcStatus | 'none'
}

export interface AttendanceSession {
  id: string
  classroom_id: string
  teacher_id: string
  session_date: string
  open_at: string
  on_time_until: string
  close_at: string
  allow_late: boolean
  is_open: boolean
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRow {
  id: string
  classroom_id: string
  session_id: string
  student_id: string
  status: AttendanceStatus
  source: 'nfc'
  checked_at: string
}

export interface DashboardPayload {
  classroom: Classroom
  students: Student[]
  sessions: AttendanceSession[]
  attendance: AttendanceRow[]
  from: string
  to: string
  serverNow: string
}


export type LearningMaterialType = 'video' | 'image' | 'slide' | 'link'

export interface LearningMaterial {
  id: string
  classroom_id: string
  teacher_id: string
  title: string
  description: string
  material_type: LearningMaterialType
  external_url: string | null
  storage_path: string | null
  original_file_name: string | null
  mime_type: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
  view_url?: string | null
}

export interface TeacherNfcStatus {
  active: boolean
  issued_at: string | null
  last_used_at: string | null
}
