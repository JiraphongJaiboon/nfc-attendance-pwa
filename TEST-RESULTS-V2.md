# ผลการตรวจ NFC Attendance PWA v2

วันที่ตรวจ: 2026-09-10

## ตรวจแล้ว

- Static project structure: ผ่าน
- Import path ภายใน `@/…`: ผ่าน
- TypeScript/TSX transpile syntax: 63 ไฟล์, ไม่พบ syntax diagnostics
- Secret scan: ไม่พบ Supabase Secret key ฝังใน source code
- Migration destructive scan: ไม่พบ `DROP TABLE`, `TRUNCATE` หรือคำสั่งลบข้อมูลเดิมใน `students`, `attendance`, `classrooms`
- Service Worker: หน้า `/api/`, `/nfc/`, `/teacher*`, `/student*` ใช้ network/no-store และไม่เก็บข้อมูลผู้ใช้ใน cache
- v2 files: พบหน้า/route สำหรับสื่อการสอน, Student materials, NFC ครู และ migration SQL ครบ

## npm install / lint / build ใน environment นี้

มีการลอง `npm install --no-audit --no-fund` แต่ environment สำหรับสร้างไฟล์ไม่สามารถติดตั้ง dependency ให้เสร็จภายในเวลาที่กำหนด จึงไม่อ้างว่า `npm run lint` และ `npm run build` ผ่านใน environment นี้

ก่อน Deploy ให้รันบนเครื่อง Windows ของผู้ใช้ ซึ่งก่อนหน้านี้ติดตั้ง npm dependencies ของโปรเจกต์ได้แล้ว:

```powershell
npm.cmd install
npm.cmd run check:static
npm.cmd run lint
npm.cmd run build
```

หาก build มี error ให้แก้ก่อน Push GitHub/Vercel
