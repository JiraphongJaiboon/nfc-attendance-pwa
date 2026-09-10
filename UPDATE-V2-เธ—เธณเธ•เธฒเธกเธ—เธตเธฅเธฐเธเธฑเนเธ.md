# อัปเดต NFC Attendance PWA เป็น v2 แบบไม่ลบข้อมูลเดิม

## สิ่งที่เพิ่ม
- แท็บ “สื่อการสอน” แยกตามห้อง
- วิดีโอ รูปภาพ สไลด์/เอกสาร และ URL
- หน้า “ดูสื่อการสอน” สำหรับนักเรียนหลังเช็กชื่อ
- แท็บ “NFC ครู” สำหรับสร้าง/ยกเลิกแท็กครู
- ครูแตะ NFC แล้วเข้าสู่ Dashboard แบบ passwordless

## ขั้นที่ 1 — สำรองโฟลเดอร์เดิม
คัดลอกโฟลเดอร์ `NFC-Attendance-PWA` ปัจจุบันเก็บไว้ 1 ชุดก่อน

## ขั้นที่ 2 — ใช้ Source Code v2
แตก ZIP v2 แล้วใช้โฟลเดอร์นั้นเป็นโปรเจกต์หลัก ค่า `.env.local` ของเครื่องเดิม **ไม่อยู่ใน ZIP** ให้คัดลอก `.env.local` จากโฟลเดอร์เก่ามาวางในโฟลเดอร์ v2 ด้วยตนเอง ห้ามส่ง Secret key ทางแชตหรือ Commit ขึ้น GitHub

## ขั้นที่ 3 — อัปเดต Supabase
Supabase > SQL Editor > New query > เปิดไฟล์ `supabase/migration-v2-media-teacher-nfc.sql` จากโปรเจกต์ v2 > Ctrl+A > Ctrl+C > วาง > Run

ต้องขึ้น Success และ Table Editor ควรเห็น `learning_materials` และ `teacher_nfc_tokens` เพิ่ม โดยข้อมูลห้อง/นักเรียน/attendance เดิมยังอยู่

## ขั้นที่ 4 — เปิดเว็บในเครื่อง
ใน VS Code Terminal:

```powershell
npm.cmd install
npm.cmd run dev
```

เปิด `http://localhost:3000` แล้ว Login ครู

## ขั้นที่ 5 — ทดสอบสื่อ
เลือกห้อง > สื่อการสอน > เพิ่มรายการ URL YouTube 1 รายการ > เปิดเผยแพร่ > Save
จากบัญชีนักเรียน เปิด `/student/materials` ต้องเห็นเฉพาะสื่อห้องตนเอง

## ขั้นที่ 6 — ทดสอบ NFC ครู
เมนู NFC ครู > สร้าง NFC ครู > คัดลอก URL
บน localhost URL เหมาะสำหรับตรวจรูปแบบเท่านั้น; การแตะจากโทรศัพท์จริงควรทำหลัง Deploy Vercel เพื่อให้ URL เป็น HTTPS สาธารณะ

## ขั้นที่ 7 — ตรวจ Production Build
```powershell
npm.cmd run check:static
npm.cmd run lint
npm.cmd run build
```

ถ้าทั้งหมดผ่าน จึง Push GitHub และ Deploy Vercel
