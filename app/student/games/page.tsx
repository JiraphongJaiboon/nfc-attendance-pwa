import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

export default async function StudentGamesPage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/games')
  if (profile?.role !== 'student') redirect('/student/login?next=/student/games')

  return <main className="student-content">
    <div className="student-content-inner stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <a className="btn btn-secondary btn-sm" href="/student/materials">← สื่อการสอน</a>
        <LogoutButton />
      </div>

      <section className="card stack" style={{ textAlign: 'center' }}>
        <div className="brand-mark" style={{ margin: '0 auto' }}>🎮</div>
        <h1 className="page-title" style={{ marginBottom: 0 }}>เกมฝึกการเขียนภาพฉาย</h1>
        <p className="muted">เลือกเกมที่ต้องการเล่น คะแนนสูงสุดจะจำไว้ในเครื่องนี้</p>
      </section>

      <div className="grid-2">
        <Link className="card stack" href="/student/games/matching" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 52 }}>🧩</div>
          <div>
            <span className="badge badge-orange">เกมที่ 1</span>
            <h2>เกมจับคู่ภาพฉาย</h2>
            <p className="muted">จับคู่คำศัพท์กับความหมาย เช่น ภาพด้านหน้า ด้านบน ด้านขวา และหลักการฉายภาพ</p>
          </div>
          <span className="btn btn-primary">เริ่มเล่นเกมจับคู่</span>
        </Link>

        <Link className="card stack" href="/student/games/quiz" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 52 }}>⚡</div>
          <div>
            <span className="badge badge-green">เกมที่ 2</span>
            <h2>เกมตอบเร็วภาพฉาย</h2>
            <p className="muted">ตอบคำถาม 10 ข้อเกี่ยวกับ Front / Top / Right View และ First-angle / Third-angle</p>
          </div>
          <span className="btn btn-orange">เริ่มเกมตอบเร็ว</span>
        </Link>
      </div>
    </div>
  </main>
}
