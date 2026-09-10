-- NFC Attendance PWA v2
-- เพิ่มสื่อการสอน + NFC ครู โดยไม่ลบข้อมูลเช็กชื่อเดิม
-- รันไฟล์นี้ 1 ครั้งใน SQL Editor ของ Supabase Project ที่ใช้งานอยู่

create extension if not exists pgcrypto;

DO $$ BEGIN
  create type public.learning_material_type as enum ('video', 'image', 'slide', 'link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete restrict,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  material_type public.learning_material_type not null,
  external_url text,
  storage_path text,
  original_file_name text,
  mime_type text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_material_source_check check (
    (external_url is not null and storage_path is null)
    or (external_url is null and storage_path is not null)
  )
);

create index if not exists learning_materials_classroom_idx
  on public.learning_materials(classroom_id, is_published, sort_order, created_at);

create table if not exists public.teacher_nfc_tokens (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status public.nfc_token_status not null default 'active',
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create unique index if not exists teacher_nfc_one_active_per_teacher
  on public.teacher_nfc_tokens(teacher_id) where status = 'active';

-- ใช้ trigger updated_at เดิมจาก schema หลัก
DROP TRIGGER IF EXISTS trg_learning_materials_updated ON public.learning_materials;
CREATE TRIGGER trg_learning_materials_updated
BEFORE UPDATE ON public.learning_materials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bucket ส่วนตัวสำหรับไฟล์สื่อ ระบบออก Signed URL ให้เฉพาะผู้มีสิทธิ์
insert into storage.buckets (id, name, public)
values ('teaching-media', 'teaching-media', false)
on conflict (id) do update set public = false;

-- RLS
alter table public.learning_materials enable row level security;
alter table public.teacher_nfc_tokens enable row level security;

-- ครูอ่านสื่อได้เฉพาะห้องที่มีสิทธิ์
DROP POLICY IF EXISTS learning_materials_teacher_select ON public.learning_materials;
CREATE POLICY learning_materials_teacher_select
ON public.learning_materials FOR SELECT TO authenticated
USING (public.teacher_has_classroom(auth.uid(), classroom_id));

-- นักเรียนอ่านได้เฉพาะสื่อที่เผยแพร่ของห้องปัจจุบันของตน
DROP POLICY IF EXISTS learning_materials_student_select ON public.learning_materials;
CREATE POLICY learning_materials_student_select
ON public.learning_materials FOR SELECT TO authenticated
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = auth.uid()
      AND s.active = true
      AND s.classroom_id = learning_materials.classroom_id
  )
);

grant select on public.learning_materials to authenticated;

-- การเพิ่ม/แก้ไข/ลบสื่อ และการจัดการ teacher NFC ทำผ่าน Server Route เท่านั้น
revoke insert, update, delete on public.learning_materials from anon, authenticated;
revoke all on public.teacher_nfc_tokens from anon, authenticated;

-- Storage ไม่เปิด public policy: อัปโหลด/ดูผ่าน Signed URL ที่ Server ออกให้เท่านั้น

-- ฟังก์ชันตรวจครูสำหรับ policy เดิม เผื่อ Project ที่เคยมีปัญหา RLS ตอนสร้างห้อง
create or replace function public.current_user_is_teacher()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;
revoke all on function public.current_user_is_teacher() from public, anon;
grant execute on function public.current_user_is_teacher() to authenticated;

DROP POLICY IF EXISTS classrooms_insert_teacher ON public.classrooms;
CREATE POLICY classrooms_insert_teacher
ON public.classrooms FOR INSERT TO authenticated
WITH CHECK (teacher_id = auth.uid() and public.current_user_is_teacher());
