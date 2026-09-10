# ผลการตรวจสอบไฟล์ใน Coding Environment

วันที่ตรวจ: 9 กันยายน 2026

## ผ่าน

- `node scripts/static-check.mjs` — ผ่าน
  - ตรวจ JSON หลัก
  - ตรวจไฟล์บังคับ
  - ตรวจ alias import `@/...` ว่ามีไฟล์ปลายทาง
  - ตรวจว่า Client Components ไม่ import Admin Supabase/Secret key
  - ตรวจ Service Worker ไม่ Cache API/NFC/Teacher/Student routes
  - ตรวจองค์ประกอบสำคัญใน `schema.sql`
- ตรวจ syntax TypeScript/TSX ด้วย TypeScript compiler ที่ติดตั้งใน environment — 50 ไฟล์, 0 syntax errors
- `node --check public/sw.js` — ผ่าน
- ไฟล์ `student-import-template.xlsx` สร้างและตรวจค่าตารางด้วย `artifact_tool` — ผ่าน

## ข้อจำกัดของ environment นี้

มีการสั่ง `npm install --no-audit --no-fund` จริง แต่ environment ไม่สามารถ resolve DNS ไป `registry.npmjs.org` ได้ (`Temporary failure in name resolution`) และคำสั่งติดตั้งหมดเวลาโดยไม่มี `node_modules` ถูกสร้าง ดังนั้น **ไม่สามารถอ้างว่า `npm run lint` และ `npm run build` ได้ถูก execute ใน container นี้** เพราะ dependencies ไม่สามารถดาวน์โหลดได้

เมื่อรันบน Windows/VS Code หรือ CI/Vercel ที่เข้าถึง npm registry ได้ ให้รันตามลำดับ:

```bash
npm install
npm run check:static
npm run lint
npm run build
```

หากมี error จาก dependency/API รุ่นใหม่ ให้ยึด `package.json` ที่ล็อกเวอร์ชันไว้ก่อน และตรวจ Environment Variables จาก `.env.example`
