import Link from 'next/link'
export default function OfflinePage() {
  return <main className="page-center"><section className="login-card stack" style={{textAlign: 'center'}}>
    <div className="brand-mark" style={{margin: '0 auto'}}>!</div>
    <h1 className="brand-title">ไม่มีอินเทอร์เน็ต</h1>
    <p className="muted">NFC Attendance ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อเช็กเวลา สิทธิ์ ห้องเรียน และบันทึกข้อมูลจากเซิร์ฟเวอร์ ระบบจะไม่บันทึกการเช็กชื่อแบบออฟไลน์</p>
    <Link className="btn btn-primary" href="/">เชื่อมต่ออินเทอร์เน็ตแล้วเปิดแอปใหม่</Link>
  </section></main>
}
