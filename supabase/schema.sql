-- NFC Attendance PWA - Supabase schema
-- รันไฟล์นี้ 1 ครั้งใน SQL Editor ของ Supabase Project ใหม่

create extension if not exists pgcrypto;

DO $$ BEGIN
  create type public.user_role as enum ('teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create type public.nfc_token_status as enum ('active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create type public.attendance_status as enum ('present', 'late');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create type public.attendance_source as enum ('nfc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create type public.classroom_teacher_role as enum ('owner', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classrooms_teacher_name_key unique (teacher_id, name)
);

create table if not exists public.classroom_teachers (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  role public.classroom_teacher_role not null default 'teacher',
  created_at timestamptz not null default now(),
  primary key (classroom_id, teacher_id)
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete restrict,
  student_code text not null check (length(trim(student_code)) between 1 and 50),
  number integer not null check (number > 0),
  prefix text not null default '',
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_classroom_code_key unique (classroom_id, student_code),
  constraint students_classroom_number_key unique (classroom_id, number),
  constraint students_student_code_global_key unique (student_code)
);

create table if not exists public.nfc_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status public.nfc_token_status not null default 'active',
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);
create unique index if not exists nfc_tokens_one_active_per_student
  on public.nfc_tokens(student_id) where status = 'active';

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete restrict,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  session_date date not null,
  open_at timestamptz not null,
  on_time_until timestamptz not null,
  close_at timestamptz not null,
  allow_late boolean not null default true,
  is_open boolean not null default true,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_classroom_date_key unique (classroom_id, session_date),
  constraint attendance_sessions_time_order check (open_at <= on_time_until and on_time_until <= close_at),
  constraint attendance_sessions_date_matches_open check (session_date = (open_at at time zone 'Asia/Bangkok')::date),
  constraint attendance_sessions_date_matches_close check (session_date = (close_at at time zone 'Asia/Bangkok')::date)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete restrict,
  session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  status public.attendance_status not null,
  source public.attendance_source not null default 'nfc',
  checked_at timestamptz not null default now(),
  constraint attendance_session_student_key unique (session_id, student_id)
);

create table if not exists public.student_classroom_moves (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  from_classroom_id uuid not null references public.classrooms(id) on delete restrict,
  to_classroom_id uuid not null references public.classrooms(id) on delete restrict,
  moved_by uuid not null references auth.users(id) on delete restrict,
  moved_at timestamptz not null default now(),
  note text
);

create index if not exists students_classroom_idx on public.students(classroom_id, number);
create index if not exists sessions_classroom_date_idx on public.attendance_sessions(classroom_id, session_date);
create index if not exists attendance_classroom_checked_idx on public.attendance(classroom_id, checked_at desc);
create index if not exists attendance_student_idx on public.attendance(student_id, checked_at desc);
create index if not exists classroom_teachers_teacher_idx on public.classroom_teachers(teacher_id, classroom_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_classrooms_updated on public.classrooms;
create trigger trg_classrooms_updated before update on public.classrooms
for each row execute function public.set_updated_at();
drop trigger if exists trg_students_updated on public.students;
create trigger trg_students_updated before update on public.students
for each row execute function public.set_updated_at();
drop trigger if exists trg_sessions_updated on public.attendance_sessions;
create trigger trg_sessions_updated before update on public.attendance_sessions
for each row execute function public.set_updated_at();

create or replace function public.teacher_has_classroom(p_teacher_id uuid, p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom_id and c.teacher_id = p_teacher_id
  ) or exists (
    select 1 from public.classroom_teachers ct
    where ct.classroom_id = p_classroom_id and ct.teacher_id = p_teacher_id
  );
$$;

create or replace function public.teacher_can_access_classroom(p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth.uid() is not null and public.teacher_has_classroom(auth.uid(), p_classroom_id);
$$;

grant execute on function public.teacher_can_access_classroom(uuid) to authenticated;

create or replace function public.is_classroom_owner(p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom_id and c.teacher_id = auth.uid()
  );
$$;

grant execute on function public.is_classroom_owner(uuid) to authenticated;

create or replace function public.add_classroom_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.classroom_teachers(classroom_id, teacher_id, role)
  values (new.id, new.teacher_id, 'owner')
  on conflict (classroom_id, teacher_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists trg_classroom_owner_membership on public.classrooms;
create trigger trg_classroom_owner_membership
after insert on public.classrooms
for each row execute function public.add_classroom_owner_membership();

create or replace function public.enforce_session_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_active boolean;
begin
  if not public.teacher_has_classroom(new.teacher_id, new.classroom_id) then
    raise exception 'ครูไม่มีสิทธิ์จัดการห้องนี้';
  end if;
  select is_active into v_active from public.classrooms where id = new.classroom_id;
  if coalesce(v_active, false) = false then
    raise exception 'ห้องเรียนถูกปิดใช้งาน';
  end if;
  if new.session_date <> (new.open_at at time zone 'Asia/Bangkok')::date
     or new.session_date <> (new.close_at at time zone 'Asia/Bangkok')::date then
    raise exception 'วันที่ของรอบต้องตรงกับเวลา Asia/Bangkok';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_session_integrity on public.attendance_sessions;
create trigger trg_session_integrity before insert or update on public.attendance_sessions
for each row execute function public.enforce_session_integrity();

create or replace function public.enforce_attendance_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_session_class uuid;
  v_student_class uuid;
  v_student_active boolean;
begin
  select classroom_id into v_session_class from public.attendance_sessions where id = new.session_id;
  select classroom_id, active into v_student_class, v_student_active from public.students where id = new.student_id;
  if v_session_class is null or v_student_class is null then
    raise exception 'ไม่พบรอบเช็กชื่อหรือนักเรียน';
  end if;
  if v_session_class <> v_student_class then
    raise exception 'นักเรียนไม่ได้อยู่ในห้องของรอบเช็กชื่อ';
  end if;
  if not v_student_active then
    raise exception 'นักเรียนถูกระงับ';
  end if;
  new.classroom_id := v_session_class;
  new.source := 'nfc';
  return new;
end;
$$;

drop trigger if exists trg_attendance_integrity on public.attendance;
create trigger trg_attendance_integrity before insert or update on public.attendance
for each row execute function public.enforce_attendance_integrity();

create or replace function public.check_in_by_nfc(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_token public.nfc_tokens%rowtype;
  v_student public.students%rowtype;
  v_class public.classrooms%rowtype;
  v_session public.attendance_sessions%rowtype;
  v_existing public.attendance%rowtype;
  v_inserted public.attendance%rowtype;
  v_now timestamptz := clock_timestamp();
  v_today date := (v_now at time zone 'Asia/Bangkok')::date;
  v_status public.attendance_status;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED', 'message', 'กรุณาเข้าสู่ระบบนักเรียนก่อน');
  end if;
  if p_token is null or length(p_token) < 20 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TAG', 'message', 'ลิงก์ NFC ไม่ถูกต้อง');
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_token from public.nfc_tokens where token_hash = v_hash limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TAG', 'message', 'ไม่พบแท็ก NFC นี้ในระบบ');
  end if;
  if v_token.status = 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'TAG_REVOKED', 'message', 'แท็กถูกยกเลิกแล้ว กรุณาติดต่อครู');
  end if;
  if v_token.student_id <> v_user then
    return jsonb_build_object('ok', false, 'code', 'ACCOUNT_MISMATCH', 'message', 'บัญชีที่เข้าสู่ระบบไม่ตรงกับเจ้าของแท็ก');
  end if;

  select * into v_student from public.students where id = v_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'STUDENT_NOT_FOUND', 'message', 'ไม่พบข้อมูลนักเรียน');
  end if;
  if not v_student.active then
    return jsonb_build_object('ok', false, 'code', 'STUDENT_SUSPENDED', 'message', 'นักเรียนถูกระงับ ไม่สามารถเช็กชื่อได้');
  end if;

  select * into v_class from public.classrooms where id = v_student.classroom_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'CLASSROOM_NOT_FOUND', 'message', 'ไม่พบห้องเรียนของนักเรียน');
  end if;
  if not v_class.is_active then
    return jsonb_build_object('ok', false, 'code', 'CLASSROOM_INACTIVE', 'message', 'ห้องเรียนนี้ถูกปิดใช้งาน');
  end if;

  select * into v_session
  from public.attendance_sessions
  where classroom_id = v_student.classroom_id and session_date = v_today
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_SESSION', 'message', 'ครูยังไม่ได้สร้างรอบเช็กชื่อของวันนี้สำหรับห้องนี้');
  end if;
  if v_session.classroom_id <> v_student.classroom_id then
    return jsonb_build_object('ok', false, 'code', 'WRONG_CLASSROOM', 'message', 'นักเรียนไม่ได้อยู่ในห้องของรอบเช็กชื่อ');
  end if;
  if not v_session.is_open then
    return jsonb_build_object('ok', false, 'code', 'SESSION_NOT_OPEN', 'message', 'ครูยังไม่เปิดรอบเช็กชื่อของห้องนี้');
  end if;

  select * into v_existing
  from public.attendance
  where session_id = v_session.id and student_id = v_student.id;
  if found then
    return jsonb_build_object(
      'ok', false, 'code', 'ALREADY_CHECKED', 'message', 'เช็กชื่อของวันที่นี้ไปแล้ว',
      'status', v_existing.status, 'checked_at', v_existing.checked_at,
      'classroom_id', v_session.classroom_id, 'session_date', v_session.session_date
    );
  end if;

  if v_now < v_session.open_at then
    return jsonb_build_object('ok', false, 'code', 'TOO_EARLY', 'message', 'ยังไม่ถึงเวลาเปิดรับเช็กชื่อ');
  end if;
  if v_now > v_session.close_at then
    return jsonb_build_object('ok', false, 'code', 'CHECKIN_CLOSED', 'message', 'หมดเวลาเช็กชื่อแล้ว');
  end if;

  if v_now <= v_session.on_time_until then
    v_status := 'present';
  else
    if not v_session.allow_late then
      return jsonb_build_object('ok', false, 'code', 'LATE_NOT_ALLOWED', 'message', 'ไม่อนุญาตให้เช็กชื่อสาย');
    end if;
    v_status := 'late';
  end if;

  insert into public.attendance(classroom_id, session_id, student_id, status, source, checked_at)
  values (v_session.classroom_id, v_session.id, v_student.id, v_status, 'nfc', v_now)
  on conflict (session_id, student_id) do nothing
  returning * into v_inserted;

  if not found then
    select * into v_existing from public.attendance
      where session_id = v_session.id and student_id = v_student.id;
    return jsonb_build_object(
      'ok', false, 'code', 'ALREADY_CHECKED', 'message', 'เช็กชื่อของวันที่นี้ไปแล้ว',
      'status', v_existing.status, 'checked_at', v_existing.checked_at,
      'classroom_id', v_session.classroom_id, 'session_date', v_session.session_date
    );
  end if;

  update public.nfc_tokens set last_used_at = v_now where id = v_token.id;

  return jsonb_build_object(
    'ok', true,
    'code', case when v_status = 'present' then 'PRESENT' else 'LATE' end,
    'message', case when v_status = 'present' then 'เช็กชื่อสำเร็จ ตรงเวลา' else 'เช็กชื่อสำเร็จ สถานะมาสาย' end,
    'status', v_status,
    'checked_at', v_now,
    'classroom_id', v_session.classroom_id,
    'classroom_name', v_class.name,
    'session_id', v_session.id,
    'session_date', v_session.session_date
  );
end;
$$;

revoke all on function public.check_in_by_nfc(text) from public, anon;
grant execute on function public.check_in_by_nfc(text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_teachers enable row level security;
alter table public.students enable row level security;
alter table public.nfc_tokens enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.student_classroom_moves enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());

-- classrooms
drop policy if exists classrooms_select_authorized on public.classrooms;
create policy classrooms_select_authorized on public.classrooms for select to authenticated
using (public.teacher_has_classroom(auth.uid(), id));
drop policy if exists classrooms_insert_teacher on public.classrooms;
create policy classrooms_insert_teacher on public.classrooms for insert to authenticated
with check (
  teacher_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
);
drop policy if exists classrooms_update_authorized on public.classrooms;
create policy classrooms_update_authorized on public.classrooms for update to authenticated
using (public.teacher_has_classroom(auth.uid(), id))
with check (public.teacher_has_classroom(auth.uid(), id));
drop policy if exists classrooms_delete_owner on public.classrooms;
create policy classrooms_delete_owner on public.classrooms for delete to authenticated
using (teacher_id = auth.uid());

-- classroom_teachers
drop policy if exists classroom_teachers_select on public.classroom_teachers;
create policy classroom_teachers_select on public.classroom_teachers for select to authenticated
using (teacher_id = auth.uid() or public.is_classroom_owner(classroom_id));
drop policy if exists classroom_teachers_insert_owner on public.classroom_teachers;
create policy classroom_teachers_insert_owner on public.classroom_teachers for insert to authenticated
with check (public.is_classroom_owner(classroom_id) and exists (select 1 from public.profiles p where p.id = teacher_id and p.role = 'teacher'));
drop policy if exists classroom_teachers_update_owner on public.classroom_teachers;
create policy classroom_teachers_update_owner on public.classroom_teachers for update to authenticated
using (public.is_classroom_owner(classroom_id)) with check (public.is_classroom_owner(classroom_id) and exists (select 1 from public.profiles p where p.id = teacher_id and p.role = 'teacher'));
drop policy if exists classroom_teachers_delete_owner on public.classroom_teachers;
create policy classroom_teachers_delete_owner on public.classroom_teachers for delete to authenticated
using (public.is_classroom_owner(classroom_id) and teacher_id <> auth.uid());

-- students
drop policy if exists students_select_authorized on public.students;
create policy students_select_authorized on public.students for select to authenticated
using (id = auth.uid() or public.teacher_has_classroom(auth.uid(), classroom_id));
drop policy if exists students_update_teacher on public.students;
create policy students_update_teacher on public.students for update to authenticated
using (public.teacher_has_classroom(auth.uid(), classroom_id))
with check (public.teacher_has_classroom(auth.uid(), classroom_id));

-- nfc_tokens: เฉพาะครูที่มีสิทธิ์ในห้องเท่านั้น นักเรียนไม่จำเป็นต้องเห็น hash
drop policy if exists nfc_tokens_select_teacher on public.nfc_tokens;
create policy nfc_tokens_select_teacher on public.nfc_tokens for select to authenticated
using (exists (
  select 1 from public.students s where s.id = nfc_tokens.student_id
  and public.teacher_has_classroom(auth.uid(), s.classroom_id)
));

-- attendance_sessions: ครูเท่านั้น
drop policy if exists sessions_select_teacher on public.attendance_sessions;
create policy sessions_select_teacher on public.attendance_sessions for select to authenticated
using (public.teacher_has_classroom(auth.uid(), classroom_id));
drop policy if exists sessions_insert_teacher on public.attendance_sessions;
create policy sessions_insert_teacher on public.attendance_sessions for insert to authenticated
with check (teacher_id = auth.uid() and public.teacher_has_classroom(auth.uid(), classroom_id));
drop policy if exists sessions_update_teacher on public.attendance_sessions;
create policy sessions_update_teacher on public.attendance_sessions for update to authenticated
using (public.teacher_has_classroom(auth.uid(), classroom_id))
with check (public.teacher_has_classroom(auth.uid(), classroom_id));
drop policy if exists sessions_delete_teacher on public.attendance_sessions;
create policy sessions_delete_teacher on public.attendance_sessions for delete to authenticated
using (public.teacher_has_classroom(auth.uid(), classroom_id));

-- attendance: นักเรียนอ่านเฉพาะของตนเอง ครูอ่านเฉพาะห้องที่มีสิทธิ์ ไม่มี policy insert/update/delete สำหรับ client
drop policy if exists attendance_select_authorized on public.attendance;
create policy attendance_select_authorized on public.attendance for select to authenticated
using (student_id = auth.uid() or public.teacher_has_classroom(auth.uid(), classroom_id));

-- move history
drop policy if exists moves_select_teacher on public.student_classroom_moves;
create policy moves_select_teacher on public.student_classroom_moves for select to authenticated
using (public.teacher_has_classroom(auth.uid(), from_classroom_id) or public.teacher_has_classroom(auth.uid(), to_classroom_id));

-- เปิด Realtime เฉพาะตาราง attendance ที่แดชบอร์ดต้องรับเหตุการณ์แบบสด
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END $$;

-- ให้ event UPDATE/DELETE มีข้อมูลครบหากเพิ่มการใช้งานภายหลัง
alter table public.attendance replica identity full;

-- Harden column-level privileges เพื่อป้องกันการ bypass API ด้วย PostgREST โดยตรง
-- ครูที่ได้รับมอบหมายแก้ชื่อ/สถานะห้องได้ แต่เปลี่ยน owner teacher_id โดยตรงไม่ได้
revoke update on public.classrooms from authenticated;
grant update (name, is_active) on public.classrooms to authenticated;

-- นักเรียนย้ายห้องผ่าน Server Route ที่ตรวจประวัติเท่านั้น; direct authenticated update เปลี่ยน classroom_id ไม่ได้
revoke update on public.students from authenticated;
grant update (number, prefix, first_name, last_name, active) on public.students to authenticated;

-- รอบเช็กชื่อแก้ได้เฉพาะเวลา/นโยบาย/สถานะ ไม่ย้าย session ไปห้องอื่นหรือเปลี่ยนวันย้อนหลังผ่าน client
revoke update on public.attendance_sessions from authenticated;
grant update (open_at, on_time_until, close_at, allow_late, is_open, closed_at) on public.attendance_sessions to authenticated;

-- ลดการเปิดเผย helper functions ต่อ anonymous role
revoke all on function public.teacher_has_classroom(uuid, uuid) from public, anon;
grant execute on function public.teacher_has_classroom(uuid, uuid) to authenticated;
revoke all on function public.teacher_can_access_classroom(uuid) from public, anon;
grant execute on function public.teacher_can_access_classroom(uuid) to authenticated;
revoke all on function public.is_classroom_owner(uuid) from public, anon;
grant execute on function public.is_classroom_owner(uuid) to authenticated;

-- ================================================================
-- v2: สื่อการสอน + NFC ครู
-- ================================================================
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

drop trigger if exists trg_learning_materials_updated on public.learning_materials;
create trigger trg_learning_materials_updated before update on public.learning_materials
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('teaching-media', 'teaching-media', false)
on conflict (id) do update set public = false;

alter table public.learning_materials enable row level security;
alter table public.teacher_nfc_tokens enable row level security;

drop policy if exists learning_materials_teacher_select on public.learning_materials;
create policy learning_materials_teacher_select on public.learning_materials for select to authenticated
using (public.teacher_has_classroom(auth.uid(), classroom_id));

drop policy if exists learning_materials_student_select on public.learning_materials;
create policy learning_materials_student_select on public.learning_materials for select to authenticated
using (
  is_published = true
  and exists (
    select 1 from public.students s
    where s.id = auth.uid() and s.active = true and s.classroom_id = learning_materials.classroom_id
  )
);

grant select on public.learning_materials to authenticated;
revoke insert, update, delete on public.learning_materials from anon, authenticated;
revoke all on public.teacher_nfc_tokens from anon, authenticated;


-- Policy สร้างห้องแบบตรวจ role ผ่าน security definer เพื่อหลีกเลี่ยง RLS recursion
create or replace function public.current_user_is_teacher()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;
revoke all on function public.current_user_is_teacher() from public, anon;
grant execute on function public.current_user_is_teacher() to authenticated;
drop policy if exists classrooms_insert_teacher on public.classrooms;
create policy classrooms_insert_teacher on public.classrooms for insert to authenticated
with check (teacher_id = auth.uid() and public.current_user_is_teacher());
