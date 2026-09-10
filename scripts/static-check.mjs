import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const errors = []
const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else files.push(full)
  }
}
walk(root)

for (const jsonFile of ['package.json', 'tsconfig.json', 'public/manifest.webmanifest']) {
  try { JSON.parse(fs.readFileSync(path.join(root, jsonFile), 'utf8')) }
  catch (e) { errors.push(`${jsonFile}: JSON ไม่ถูกต้อง: ${e.message}`) }
}

const sourceFiles = files.filter((f) => /\.(ts|tsx)$/.test(f))
const importRe = /from\s+['"](@\/[^'"]+)['"]|import\s+['"](@\/[^'"]+)['"]/g
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(importRe)) {
    const spec = (match[1] || match[2]).replace('@/', '')
    const base = path.join(root, spec)
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
    if (!candidates.some(fs.existsSync)) errors.push(`${path.relative(root, file)}: หา import ${match[1] || match[2]} ไม่พบ`)
  }
}

const envText = fs.readFileSync(path.join(root, '.env.example'), 'utf8')
for (const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','NEXT_PUBLIC_SITE_URL','STUDENT_EMAIL_DOMAIN']) {
  if (!envText.includes(`${name}=`)) errors.push(`.env.example ขาด ${name}`)
}

for (const file of sourceFiles.filter((f) => fs.readFileSync(f, 'utf8').includes("'use client'"))) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes('SUPABASE_SECRET_KEY') || text.includes('createAdminSupabase') || text.includes('@/lib/supabase/admin')) {
    errors.push(`${path.relative(root, file)}: client code อ้างถึง Secret/Admin Supabase`)
  }
}

const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8')
for (const fragment of ["url.pathname.startsWith('/api/')", "url.pathname.startsWith('/nfc/')", "url.pathname.startsWith('/teacher')", "url.pathname.startsWith('/student')", "cache: 'no-store'"]) {
  if (!sw.includes(fragment)) errors.push(`Service Worker ขาดกฎป้องกัน cache: ${fragment}`)
}

for (const required of ['supabase/schema.sql','supabase/migration-v2-media-teacher-nfc.sql','README.md','START-WINDOWS.bat','public/templates/student-import-template.xlsx','public/icons/icon-192.png','public/icons/icon-512.png','app/teacher/materials/page.tsx','app/student/materials/page.tsx','app/teacher/teacher-nfc/page.tsx','app/teacher-nfc/[token]/route.ts']) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`ขาดไฟล์ ${required}`)
}

const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8')
for (const fragment of ['check_in_by_nfc','enable row level security','supabase_realtime','token_hash','Asia/Bangkok','students_student_code_global_key','attendance_session_student_key','learning_materials','teacher_nfc_tokens','teaching-media']) {
  if (!schema.includes(fragment)) errors.push(`schema.sql ขาดองค์ประกอบ: ${fragment}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Static check ผ่าน: ${files.length} files, ${sourceFiles.length} TypeScript/TSX files`)
