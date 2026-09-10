# NFC Attendance PWA

เวอร์ชัน dependency หลักที่ล็อกไว้ใน `package.json`: Next.js 16.3.4, React 19.2.8, Supabase JS 2.115.0, `@supabase/ssr` 0.12.7, TypeScript 7.0.2 และ `xlsx` 0.18.5

ระบบเช็กชื่อนักเรียนด้วย NFC สำหรับ **โรงเรียนเทศบาล ๔ (เพาะชำ)** พัฒนาเป็น Next.js App Router + TypeScript + Supabase Auth/Postgres/Realtime/RLS + PWA และใช้ `xlsx` สำหรับนำเข้า/ส่งออกรายงาน Excel

> แนวคิด NFC ของระบบนี้ **ไม่ใช้ Web NFC API และไม่อ่าน Serial/UID ของแท็ก** แต่เขียน URL เฉพาะนักเรียนลง NFC Tag เช่น `https://your-site.vercel.app/nfc/TOKEN` จึงรองรับโทรศัพท์ที่เปิด URL จาก NFC ได้กว้างกว่า Web NFC API

## 1. คุณสมบัติที่มีในโปรเจกต์

- ครูเข้าสู่ระบบด้วยอีเมล/รหัสผ่านผ่าน Supabase Auth
- สร้าง/เปลี่ยนชื่อ/เปิด/ปิดห้องเรียนหลายห้อง
- RLS จำกัดข้อมูลตามห้องที่ครูเป็นเจ้าของหรือได้รับมอบหมาย
- สลับห้องแล้วโหลดรายชื่อ รอบ ตาราง และ Realtime ของห้องใหม่เท่านั้น
- เพิ่มนักเรียนทีละคน หรือ Import `.xlsx`, `.xls`, `.csv` โดยระบุห้องปลายทาง
- สร้างบัญชีนักเรียนใน Supabase Auth อัตโนมัติจากรหัสนักเรียน + PIN
- PIN ไม่ถูกเก็บเป็นข้อความในตาราง แต่เป็นรหัสผ่านของ Supabase Auth
- รหัสนักเรียนบังคับไม่ซ้ำทั้งระบบ เพื่อให้ล็อกอินด้วย “รหัสนักเรียน + PIN” ได้โดยไม่ต้องเลือกห้อง
- สร้าง NFC Token แบบสุ่มด้วย `crypto.randomBytes(32)` และฐานข้อมูลเก็บเฉพาะ SHA-256 hash
- ออกแท็กใหม่แล้วแท็กเดิมถูก revoke ทันที
- สร้างรอบเช็กชื่อแยกตามห้อง + วันที่ และกำหนด เปิดรับ / ตรงเวลาถึง / ปิดรับ / อนุญาตมาสาย
- Database Function `check_in_by_nfc` ใช้เวลาจากฐานข้อมูลและเขตเวลา `Asia/Bangkok`
- ป้องกันเช็กชื่อซ้ำด้วย Unique Constraint `(session_id, student_id)`
- Dashboard ตารางนักเรียนเป็นแถว วันที่เป็นคอลัมน์ พร้อม `✓`, `สาย`, `–`, `ปิด`, `ไม่มีรอบ`, `ถูกระงับ`
- Supabase Realtime กรอง `attendance.classroom_id` และยังถูก RLS ตรวจสิทธิ์อีกชั้น
- Export Excel แยกตามห้อง 5 Sheet
- PWA ติดตั้งลงหน้าจอโทรศัพท์ได้ และ Service Worker **ไม่ Cache Auth/API/NFC/Teacher/Student data**
- มีหน้า Offline และการเช็กชื่อ NFC จะไม่ทำงานแบบออฟไลน์

## 2. โครงสร้างสำคัญ

```text
app/
  api/
    auth/                 # teacher/student login + logout
    nfc/check-in/         # เรียก Database Function เช็กชื่อ
    teacher/              # API ครูทุกชุดตรวจสิทธิ์ห้อง
  nfc/[token]/            # URL ที่เขียนลง NFC Tag
  student/login/          # รหัสนักเรียน + PIN
  teacher/                # Dashboard และหน้าจัดการครู
components/               # UI และ Realtime client
lib/supabase/             # Browser / Server / Admin clients
public/
  manifest.webmanifest
  sw.js
  icons/
  templates/student-import-template.xlsx
supabase/
  schema.sql
  create-teacher.sql.example
```

## 3. สิ่งที่ต้องติดตั้งบน Windows

1. ติดตั้ง **Node.js LTS** (แนะนำ Node.js 22 หรือใหม่กว่า)
2. ติดตั้ง **Visual Studio Code**
3. ติดตั้ง Git หากต้องการ Deploy ผ่าน GitHub
4. เปิดโฟลเดอร์โปรเจกต์ใน VS Code
5. เปิด Terminal ใน VS Code แล้วรัน:

```bash
npm install
```

หรือดับเบิลคลิก `START-WINDOWS.bat` หลังตั้งค่า `.env.local` แล้ว

## 4. สร้าง Supabase Project

1. เข้า Supabase Dashboard และสร้าง Project ใหม่
2. รอฐานข้อมูลพร้อมใช้งาน
3. เปิด **SQL Editor**
4. เปิดไฟล์ `supabase/schema.sql`
5. คัดลอก SQL ทั้งไฟล์ไปรัน **1 ครั้ง**
6. Schema จะสร้าง Tables, Constraints, Triggers, Database Function, RLS Policies และเพิ่ม `attendance` เข้า `supabase_realtime`

ตารางหลัก:

- `profiles`
- `classrooms`
- `classroom_teachers`
- `students`
- `nfc_tokens`
- `attendance_sessions`
- `attendance`
- `student_classroom_moves`

### เหตุผลที่ `attendance` มี `classroom_id` เพิ่ม

ฟิลด์นี้เป็นข้อมูล denormalized ที่ Trigger กำหนดจาก `attendance_sessions.classroom_id` เอง นักเรียนส่งค่าเองไม่ได้ จุดประสงค์คือให้ Realtime สมัครเฉพาะ `classroom_id=eq.<ห้องที่เลือก>` ได้โดยตรง ขณะเดียวกัน RLS ยังตรวจสิทธิ์ฝั่งฐานข้อมูล ไม่ได้พึ่ง Client Filter เพียงอย่างเดียว

## 5. ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STUDENT_EMAIL_DOMAIN=students.school.local
```

หา Publishable key และ Secret key จาก Supabase Dashboard > Project Settings > API Keys

**กฎสำคัญ**

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ใช้ใน Browser ได้
- `SUPABASE_SECRET_KEY` ใช้เฉพาะ Server Route เท่านั้น
- ห้ามนำ `SUPABASE_SECRET_KEY` ไปใส่ตัวแปร `NEXT_PUBLIC_*`
- `.env.local` ถูกใส่ใน `.gitignore` แล้ว ห้าม Commit
- ไม่ต้องส่ง Secret key ให้บุคคลอื่นหรือใส่ในแชต

## 6. สร้างบัญชีครูครั้งแรก

นักเรียนถูกสร้างจากหน้าเว็บโดยครู แต่บัญชีครูแรกต้องสร้างจาก Supabase Dashboard

1. Supabase > **Authentication > Users > Add user**
2. ใส่อีเมลครูและรหัสผ่าน
3. เปิด **Auto Confirm User**
4. สร้าง User แล้วคัดลอก `User UUID`
5. เปิด `supabase/create-teacher.sql.example`
6. แทน `YOUR_TEACHER_AUTH_USER_UUID` ด้วย UUID จริง และเปลี่ยน `ชื่อครู`
7. รันใน SQL Editor
8. เปิด `http://localhost:3000` แล้วเข้าสู่ระบบครู

## 7. เริ่มระบบในเครื่อง

```bash
npm run dev
```

เปิด `http://localhost:3000`

ก่อน Deploy ควรรัน:

```bash
npm run check:static
npm run lint
npm run build
npm start
```

## 8. สร้างและจัดการห้องเรียน

1. เข้าระบบครู
2. ไป **จัดการห้องเรียน**
3. กรอกชื่อ เช่น `ป.1/1`
4. ชื่อห้องซ้ำภายใต้ครูเจ้าของเดียวกันไม่ได้
5. กด “เลือกห้องนี้” หรือใช้ตัวเลือกห้องด้านบน
6. เปลี่ยนชื่อห้องได้โดยไม่กระทบ ID และประวัติเดิม
7. ปิดห้องได้โดยข้อมูลเดิมไม่ถูกลบ
8. ห้องที่ปิดจะสร้างรอบใหม่และเช็กชื่อไม่ได้ จนกว่าจะเปิดอีกครั้ง
9. ระบบไม่ให้ลบห้องผ่านหน้าเว็บเพื่อป้องกันการสูญหายของประวัติ ให้ใช้ “ปิดห้อง” แทน

### ครูหลายคนต่อห้อง

Schema รองรับ `classroom_teachers` แล้ว แม้ UI รุ่นนี้เน้นเจ้าของห้อง หากต้องการมอบสิทธิ์ครูอีกคน สามารถเพิ่มครูที่มี `profiles.role='teacher'` เข้า `classroom_teachers` โดยกำหนด role `teacher` ผ่าน SQL/Admin process ที่เชื่อถือได้ RLS และทุก Teacher API จะยอมรับครูที่ถูกมอบหมาย

## 9. เพิ่มนักเรียนเข้าห้อง

1. เลือกห้องจากตัวเลือกด้านบนก่อน
2. ไป **นักเรียนและ NFC**
3. กรอก เลขที่ / รหัสนักเรียน / คำนำหน้า / ชื่อ / นามสกุล / PIN
4. PIN ต้องเป็นตัวเลขอย่างน้อย 6 ตัว
5. ระบบสร้าง Auth User และบันทึกนักเรียนเข้าห้องที่เลือก
6. ระบบใช้ Internal email ที่สร้างจาก SHA-256 ของรหัสนักเรียน + `STUDENT_EMAIL_DOMAIN` ผู้ใช้ไม่จำเป็นต้องรู้ email นี้

### Import Excel / XLS / CSV

ดาวน์โหลดไฟล์ `public/templates/student-import-template.xlsx` จากหน้าเว็บหรือไฟล์ในโปรเจกต์

คอลัมน์:

- ห้องเรียน
- เลขที่
- รหัสนักเรียน
- คำนำหน้า
- ชื่อ
- นามสกุล
- PIN

**รหัสนักเรียนควรกำหนด Cell เป็น Text** เพื่อรักษาเลขศูนย์ด้านหน้า เช่น `0001`

เมื่อเลือกห้องปลายทางในเว็บแล้ว คอลัมน์ “ห้องเรียน” เว้นว่างได้ หากกรอกต้องตรงกับห้องปลายทาง ระบบตรวจข้อมูลทั้งหมดก่อนสร้างบัญชี และจำกัด 500 คน/ไฟล์ ขนาดไฟล์ 5 MB

## 10. ย้ายนักเรียนระหว่างห้องอย่างปลอดภัย

ที่หน้า **นักเรียนและ NFC > แก้ไข/ย้าย** เลือกห้องปลายทาง

ระบบตรวจ:

- ครูต้องมีสิทธิ์ทั้งห้องต้นทางและห้องปลายทาง
- เลขที่ต้องไม่ซ้ำห้องปลายทาง
- หากนักเรียน **ยังไม่มีประวัติเช็กชื่อ** ระบบย้ายและบันทึก `student_classroom_moves`
- หากนักเรียน **มีประวัติเช็กชื่อแล้ว** ระบบบล็อกการย้าย (`MOVE_BLOCKED_HISTORY`) เพื่อไม่ให้ประวัติห้องเดิมถูกตีความใหม่ย้อนหลัง

กรณีมีประวัติแล้ว วิธีที่ปลอดภัยที่สุดในรุ่นนี้คือสร้างบัญชีนักเรียนใหม่สำหรับห้องใหม่ หรือให้ผู้ดูแลฐานข้อมูลดำเนิน migration แบบมี snapshot/ประวัติอย่างเป็นทางการ ห้ามแก้ `classroom_id` ตรง ๆ โดยไม่วางแผนข้อมูลย้อนหลัง

## 11. สร้างรอบเช็กชื่อแยกตามห้องและวันที่

1. เลือกห้อง
2. ไป **ตารางเช็กชื่อ**
3. เลือกช่วงวันที่และ “วันที่ที่ดูรายละเอียด”
4. กด **สร้างรอบวันที่เลือก**
5. กำหนด:
   - เวลาเปิดรับ
   - ตรงเวลาถึง
   - เวลาปิดรับ
   - อนุญาตมาสายหรือไม่
   - เปิด/ปิดรอบ
6. ห้องหนึ่งมีได้ 1 รอบต่อวันที่กำหนด
7. เวลาเรียงตาม `เปิดรับ <= ตรงเวลาถึง <= ปิดรับ`
8. Database ตรวจวันและเวลาใน `Asia/Bangkok`

ตัวอย่าง 07:45 / 08:00 / 08:15:

- ก่อน 07:45: ยังเช็กไม่ได้
- 07:45–08:00: `present`
- หลัง 08:00–08:15: `late` เฉพาะถ้าอนุญาตมาสาย
- หลัง 08:15: ปฏิเสธ

กด **ปิดห้อง** และ **ปิดรอบ** แยกกันได้ สถานะสองอย่างนี้เป็นคนละเรื่อง

## 12. สร้าง URL และเขียนลง NFC Tag

1. เลือกห้อง
2. ไป **นักเรียนและ NFC**
3. กด **สร้างลิงก์** ที่นักเรียน
4. ยืนยันการออกแท็ก
5. ระบบแสดง URL เช่น:

```text
https://your-site.vercel.app/nfc/AbCdEf...token...
```

6. คัดลอกทันที ลิงก์จริงไม่ได้ถูกเก็บในฐานข้อมูล มีเพียง SHA-256 hash
7. ถ้าออกใหม่ ลิงก์เดิมถูก revoke ทันที

### เขียน URL ด้วย NFC Tools

1. ติดตั้งแอป **NFC Tools** บนโทรศัพท์ที่รองรับการเขียน NFC
2. เปิด NFC Tools > **Write**
3. กด **Add a record**
4. เลือก **URL / URI**
5. วาง URL ที่ระบบสร้าง
6. กด **Write**
7. นำโทรศัพท์ไปแตะ NFC Tag
8. ทดสอบด้วยโทรศัพท์นักเรียน

ไม่ต้องเขียน `classroom_id`, วันที่ หรือ session ลงแท็ก มีเพียง URL Token เท่านั้น

## 13. ขั้นตอนนักเรียนครั้งแรก

1. นักเรียนแตะ NFC Tag ของตน
2. ถ้ายังไม่มี Session ระบบพาไป `/student/login`
3. กรอก **รหัสนักเรียน + PIN**
4. ระบบกลับไป URL NFC เดิมอัตโนมัติ
5. Database ตรวจว่า Auth User เป็นเจ้าของ Token จริง
6. Database อ่านห้องปัจจุบันจาก `students.classroom_id`
7. Database หาเฉพาะรอบของ **วันนี้ตาม Asia/Bangkok** ในห้องนั้น
8. Database ตรวจเวลาและบันทึก
9. ครั้งต่อไป Session ยังอยู่จึงเช็กชื่อโดยไม่กรอก PIN ซ้ำ

นักเรียนไม่สามารถส่งห้อง วันที่ หรือ session เพื่อเลือกเองได้

## 14. ดูตารางเครื่องหมายถูกและ Realtime

หน้า **ตารางเช็กชื่อ**:

- แถว = นักเรียนปัจจุบันของห้องที่เลือก
- คอลัมน์ = วันที่ในช่วงที่เลือก
- `✓` = ตรงเวลา
- `สาย` = มาสาย
- `–` = ยังไม่เช็กชื่อและรอบยังรับอยู่
- `ปิด` = รอบปิด/หมดเวลาและยังไม่เช็ก
- `ไม่มีรอบ` = ยังไม่ได้สร้างรอบวันนั้น
- `ถูกระงับ` = นักเรียนถูกระงับ

เมื่อมี `attendance INSERT` Supabase Realtime ส่งเฉพาะ event ที่ `classroom_id` ตรงกับห้องที่เลือก และ RLS ตรวจว่าครูมีสิทธิ์อ่าน row นั้น เมื่อสลับห้อง component จะ `removeChannel()` ของห้องเดิมก่อนสมัครห้องใหม่

## 15. รายงาน Excel แยกตามห้อง

1. เลือกห้องก่อน
2. ไป **รายงาน Excel**
3. กำหนดช่วงวันที่
4. เลือกวันที่สำหรับ Sheet รายละเอียด
5. กดส่งออก `.xlsx`

ไฟล์มี 5 Sheet:

1. `สรุปการเช็กชื่อ`
2. `ตารางรายวัน`
3. `รายละเอียดวันที่เลือก`
4. `ยังไม่เช็กชื่อ`
5. `ข้อมูลรายงาน`

ชื่อไฟล์มีชื่อห้องและช่วงวันที่ เช่น `NFC-Attendance-ป.1-1-2026-09-01-2026-09-30.xlsx`

## 16. Supabase Site URL และ Redirect URL

Supabase > Authentication > URL Configuration

Local:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

Production หลัง Deploy:

- Site URL: `https://YOUR-SITE.vercel.app`
- Redirect URLs: `https://YOUR-SITE.vercel.app/**`

และเปลี่ยน Vercel Environment Variable:

```env
NEXT_PUBLIC_SITE_URL=https://YOUR-SITE.vercel.app
```

จากนั้น Redeploy ก่อนสร้าง NFC URL จริง มิฉะนั้นลิงก์จะชี้ localhost

## 17. Deploy GitHub + Vercel

### GitHub

```bash
git init
git add .
git commit -m "NFC Attendance PWA"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/nfc-attendance-pwa.git
git push -u origin main
```

ตรวจให้แน่ใจว่า `.env.local` **ไม่ถูก Commit**

### Vercel

1. เข้า Vercel > Add New Project
2. Import GitHub repository
3. Framework Preset: Next.js
4. เพิ่ม Environment Variables 5 ตัวจาก `.env.example` โดยใช้ค่าจริง
5. `NEXT_PUBLIC_SITE_URL` ต้องเป็น URL Production
6. Deploy
7. กลับ Supabase ไปตั้ง Site URL / Redirect URL ให้เป็น Vercel URL
8. Redeploy หากแก้ Environment Variable

Vercel มี HTTPS อัตโนมัติ เหมาะกับ PWA และ NFC URL จริง

## 18. PWA และ Cache

`public/sw.js` ใช้นโยบาย:

- Cache เฉพาะ `/offline`, manifest, icons และ `/_next/static/*`
- Navigation ใช้ network และ fallback `/offline`
- ไม่ Cache `/api/*`
- ไม่ Cache `/nfc/*`
- ไม่ Cache `/teacher*`
- ไม่ Cache `/student*`
- การเช็กชื่อ POST จะไม่ถูก Service Worker Cache

จึงไม่ควรมีข้อมูลห้องเดิมหลงอยู่ใน Cache เมื่อสลับห้องหรือออกจากระบบ

## 19. Security Checklist

- [x] Publishable key เท่านั้นที่ Browser
- [x] Secret key เฉพาะ `lib/supabase/admin.ts` ซึ่งถูกเรียกจาก Server Route
- [x] `.env.local` ใน `.gitignore`
- [x] NFC Token สุ่มแบบ cryptographically secure
- [x] DB เก็บ Token hash เท่านั้น
- [x] PIN อยู่ใน Supabase Auth ไม่เก็บ plain text ใน `students`
- [x] Teacher API ตรวจ Auth role และสิทธิ์ห้อง
- [x] RLS ทุกตาราง
- [x] Student check-in ต้องผ่าน `check_in_by_nfc`
- [x] เวลาใช้ `clock_timestamp()` ที่ Database
- [x] Student เลือก `classroom_id`, date, session จาก Client ไม่ได้
- [x] Attendance Trigger ตรวจ Student/Session อยู่ห้องเดียวกัน
- [x] Unique Constraint ป้องกันเช็กซ้ำ
- [x] Realtime ผ่าน RLS และกรอง `classroom_id`
- [x] Import ตรวจชนิดไฟล์ ขนาด จำนวนแถว Header/ข้อมูลซ้ำ/PIN

## 20. รายการทดสอบก่อนใช้งานจริง

### Auth / สิทธิ์

- [ ] ครูเข้าสู่ระบบได้
- [ ] นักเรียน/ผู้ไม่มี profile teacher เข้า `/teacher` ไม่ได้
- [ ] ครู A แก้ URL/Request เป็น `classroom_id` ของครู B แล้วได้ 403
- [ ] Publishable key ไม่สามารถอ่านข้อมูลข้าม RLS

### ห้องเรียน

- [ ] สร้าง ป.1/1 และ ป.1/2 ได้
- [ ] ชื่อซ้ำภายใต้เจ้าของเดียวกันถูกปฏิเสธ
- [ ] เปลี่ยนชื่อแล้วประวัติเดิมยังอยู่
- [ ] ปิดห้องแล้วสร้างรอบใหม่ไม่ได้
- [ ] เปิดห้องกลับแล้วใช้งานต่อได้
- [ ] สลับห้องแล้วรายชื่อ/รอบ/ตารางเปลี่ยนทั้งหมด

### นักเรียน

- [ ] เพิ่มนักเรียนทีละคนได้
- [ ] รหัสนักเรียน `0001` ยังมีศูนย์ด้านหน้า
- [ ] รหัสนักเรียนซ้ำทั้งระบบถูกปฏิเสธ
- [ ] เลขที่ซ้ำในห้องถูกปฏิเสธ
- [ ] Import template ได้ถูกห้อง
- [ ] Import ที่ระบุชื่อห้องไม่ตรงห้องปลายทางถูกปฏิเสธ
- [ ] นักเรียนไม่มีประวัติย้ายห้องได้และมี `student_classroom_moves`
- [ ] นักเรียนมีประวัติแล้วถูกบล็อกการย้าย
- [ ] ระงับนักเรียนแล้วเช็กชื่อไม่ได้

### NFC

- [ ] สร้าง URL ได้
- [ ] DB `nfc_tokens` ไม่มี Token จริง มีเฉพาะ hash
- [ ] ออกลิงก์ใหม่แล้วลิงก์เดิม `TAG_REVOKED`
- [ ] บัญชีอื่นแตะแท็กแล้วได้ `ACCOUNT_MISMATCH`
- [ ] นักเรียนแตะแท็กของตนเองได้
- [ ] Session นักเรียนถูกจำหลัง Login ครั้งแรก

### รอบและเวลา

- [ ] สร้างรอบแยก ป.1/1 และ ป.1/2 วันเดียวกันได้
- [ ] สร้างรอบซ้ำห้องเดิม/วันเดิมไม่ได้
- [ ] ก่อนเปิดรับ = ปฏิเสธ
- [ ] ช่วงตรงเวลา = `present`
- [ ] หลังตรงเวลาและ allow_late = `late`
- [ ] หลังตรงเวลาและไม่ allow_late = ปฏิเสธ
- [ ] หลัง close_at = ปฏิเสธ
- [ ] ปิดรอบ = ปฏิเสธ
- [ ] ไม่มีรอบวันนี้ = ข้อความภาษาไทยถูกต้อง
- [ ] แตะซ้ำ = `ALREADY_CHECKED` และไม่มี row ซ้ำ

### Dashboard / Realtime

- [ ] ก่อนเช็กชื่อแสดง `–`
- [ ] แตะสำเร็จแล้ว `✓` โผล่โดยไม่ Refresh
- [ ] มาสายแสดง `สาย`
- [ ] สลับห้องแล้ว Realtime ห้องเดิมไม่โผล่
- [ ] เปิดดูหลายวันที่ข้อมูลไม่ปะปน
- [ ] คลิกช่องที่เช็กแล้วเห็นเวลา
- [ ] สรุป ตรงเวลา/สาย/ยังไม่เช็ก ถูกต้อง

### Excel / PWA / Production

- [ ] Export 5 Sheet และชื่อห้องถูกต้อง
- [ ] Export ห้อง ป.1/1 ไม่มีนักเรียน/attendance ของ ป.1/2
- [ ] `npm run lint` ผ่าน
- [ ] `npm run build` ผ่าน
- [ ] Vercel Production เปิดได้
- [ ] `NEXT_PUBLIC_SITE_URL` เป็น Production URL
- [ ] ติดตั้ง PWA Android/iPhone ได้
- [ ] ปิดอินเทอร์เน็ตแล้วเห็น Offline message
- [ ] ปิดอินเทอร์เน็ตแล้ว NFC ไม่สร้าง attendance
- [ ] NFC Tag จริงเปิด URL Production และเช็กชื่อได้

## 21. หมายเหตุการใช้งานจริง

- ใช้ NFC Tag ที่รองรับ NDEF URL เช่น NTAG213/215/216
- หลังเขียน URL ควร Lock Tag เฉพาะเมื่อมั่นใจว่าไม่ต้องแก้ URL; โดยทั่วไป “ออก Token ใหม่” หมายถึงต้องเขียน URL ใหม่ลงแท็กใบใหม่หรือแท็กที่ยังเขียนซ้ำได้
- หากนักเรียนทำโทรศัพท์หาย ให้เปลี่ยน PIN และให้ออกจาก Session เก่าผ่าน Supabase Admin ตามนโยบายโรงเรียน
- ควรใช้โดเมนจริงของโรงเรียนบน Vercel หากนำใช้ Production ระยะยาว
- ควรสำรองฐานข้อมูล Supabase และกำหนด retention ตามนโยบายข้อมูลส่วนบุคคลของโรงเรียน


---

## 22. อัปเดต v2: สื่อการสอน + NFC ครู

เวอร์ชันนี้ **คงระบบเช็กชื่อเดิมทั้งหมด** และเพิ่ม 2 ส่วนใหม่โดยไม่ลบประวัติเดิม:

1. **สื่อการสอนรายห้อง** — ครูเลือกห้องแล้วเพิ่ม/แก้ไข/เผยแพร่/ซ่อน/ลบ วิดีโอ รูปภาพ สไลด์/เอกสาร หรือลิงก์ นักเรียนที่เข้าสู่ระบบเห็นเฉพาะสื่อที่เผยแพร่ของห้องปัจจุบันตนเอง หลังเช็กชื่อสำเร็จมีปุ่ม “ดูสื่อการสอนของห้อง”
2. **NFC ครู** — ครูสร้าง URL เฉพาะตนเองแล้วเขียนลง NFC Tag เมื่อแตะ ระบบตรวจ hash ของแท็กและสิทธิ์ครู จากนั้นสร้าง Supabase passwordless session และเข้าสู่ `/teacher` โดยไม่ต้องกรอกรหัสผ่านใหม่

### อัปเกรด Project Supabase ที่สร้างไว้แล้ว

**ห้ามรัน `schema.sql` ซ้ำบนฐานข้อมูลที่ใช้งานแล้ว** ให้เปิด Supabase > SQL Editor แล้วรันเฉพาะ:

```text
supabase/migration-v2-media-teacher-nfc.sql
```

Migration นี้เพิ่ม:

- `learning_materials`
- `teacher_nfc_tokens`
- Storage bucket ส่วนตัว `teaching-media`
- RLS สำหรับสื่อการสอน
- Policy สร้างห้องที่ตรวจ role ครูผ่าน security-definer helper

ข้อมูล `classrooms`, `students`, `attendance_sessions`, `attendance` และ NFC นักเรียนเดิมไม่ถูกลบ

### สื่อการสอน

เมนูครู: **สื่อการสอน**

- ต้องเลือกห้องก่อนเสมอ
- เพิ่มได้ 4 ประเภท: วิดีโอ / รูปภาพ / สไลด์-เอกสาร / ลิงก์
- ใช้ URL ได้ เช่น YouTube, Google Slides, Canva, Google Drive
- อัปโหลดไฟล์ตรงได้: JPG/PNG/WEBP/GIF, MP4/WEBM/MOV, PDF/PPT/PPTX
- การอัปโหลดตรงจำกัด 6 MB ต่อไฟล์เพื่อความเสถียร; วิดีโอหรือไฟล์ใหญ่ให้ฝาก YouTube/Drive/Canva แล้วใส่ URL
- ไฟล์ถูกเก็บใน private Supabase Storage และหน้าเว็บออก Signed URL อายุสั้นให้ผู้มีสิทธิ์เท่านั้น
- ปิด “เผยแพร่” ได้เพื่อเตรียมสื่อไว้ก่อนโดยนักเรียนยังไม่เห็น

นักเรียนเข้า `/student/materials` ได้เมื่อมี Student Session และระบบจะอ่าน `students.classroom_id` จากฐานข้อมูลเอง ไม่รับ classroom จาก URL

### NFC ครู

เมนูครู: **NFC ครู**

1. กด “สร้าง NFC ครู”
2. คัดลอก URL ที่แสดงเพียงครั้งเดียว
3. หลัง Deploy ให้ URL เป็นรูปแบบ `https://YOUR-SITE.vercel.app/teacher-nfc/TOKEN`
4. เขียน URL ลงแท็กด้วย NFC Tools แบบ URL/URI Record
5. เมื่อแตะแท็ก ระบบจะเข้าสู่บัญชีครูและเปิด Dashboard โดยอัตโนมัติ
6. “ออก NFC ครูใหม่” จะ revoke แท็กเดิมทันที
7. หากแท็กหาย ให้เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน แล้วกด “ยกเลิก NFC ครู” ทันที

**คำเตือน:** NFC ครูเป็น bearer credential หรือ “กุญแจบัญชีครู” ผู้ที่มีแท็ก/URL สามารถเข้าสู่บัญชีครูได้ จึงห้ามแชร์ URL, ห้ามถ่ายภาพ QR/URL ลงสาธารณะ และควร revoke ทันทีเมื่อสูญหาย

### ก่อน Deploy v2

รันบน Windows:

```powershell
npm.cmd run check:static
npm.cmd run lint
npm.cmd run build
```

จากนั้น Deploy ตามหัวข้อ GitHub + Vercel เดิม เมื่อได้ Production URL แล้ว ต้องตั้ง `NEXT_PUBLIC_SITE_URL` บน Vercel ให้เป็น Production URL และ Redeploy **ก่อน** สร้าง NFC นักเรียนหรือ NFC ครูตัวจริง
