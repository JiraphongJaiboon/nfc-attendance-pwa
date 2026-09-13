import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { StudentNav } from '@/components/student-nav'

export const dynamic = 'force-dynamic'

export default async function StudentHomePage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login')
  if (profile?.role !== 'student') redirect('/')

  return <main className="student-content">
    <div className="student-content-inner stack">
      <StudentNav active="home" />
      <section className="student-hero card">
        <div>
          <span className="badge badge-green">บัญชีนักเรียน</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>เลือกสิ่งที่ต้องการเรียนรู้</h1>
          <p className="page-subtitle">ดูสื่อการสอนของห้อง หรือฝึกทักษะการเขียนภาพฉายผ่านเกม</p>
        </div>
      </section>

      <section className="student-choice-grid">
        <Link className="student-choice-card" href="/student/materials">
          <span className="student-choice-icon">📚</span>
          <div>
            <h2>สื่อการสอน</h2>
            <p>ดูวิดีโอ รูปภาพ สไลด์ เอกสาร และลิงก์ที่ครูเผยแพร่</p>
          </div>
          <span className="student-choice-arrow">เปิดสื่อ →</span>
        </Link>

        <Link className="student-choice-card student-choice-game" href="/student/game">
          <span className="student-choice-icon">🎮</span>
          <div>
            <h2>เกมการเขียนภาพฉาย</h2>
            <p>ฝึกมองภาพ 3 มิติ แล้วเลือกภาพฉายด้านหน้า ด้านบน และด้านขวาให้ถูกต้อง</p>
          </div>
          <span className="student-choice-arrow">เริ่มเล่น →</span>
        </Link>
      </section>
    </div>
  </main>
}
