import Link from 'next/link'
import { LogoutButton } from '@/components/logout-button'

export function StudentNav({ active }: { active: 'home' | 'materials' | 'game' }) {
  const item = (key: typeof active, href: string, label: string) => (
    <Link className={`student-tab ${active === key ? 'student-tab-active' : ''}`} href={href}>{label}</Link>
  )

  return <nav className="student-tabs" aria-label="เมนูนักเรียน">
    {item('home', '/student', 'หน้าหลัก')}
    {item('materials', '/student/materials', 'สื่อการสอน')}
    {item('game', '/student/game', 'เกมภาพฉาย')}
    <span className="student-tab-logout"><LogoutButton /></span>
  </nav>
}
