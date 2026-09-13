-- NFC Attendance PWA V4
-- รวม SolidLab 3D + มินิเกม + คะแนน + สไลด์เลื่อนอ่านแบบการ์ตูน
-- รัน 1 ครั้งใน Supabase SQL Editor ของ Project เดิม

create extension if not exists pgcrypto;

create table if not exists public.solidlab_topics (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  slug text not null,
  tag text not null default '',
  num text not null default '',
  title text not null check (length(trim(title)) between 1 and 200),
  subtitle text not null default '',
  info text not null default '',
  shape_key text not null default 'cube' check (shape_key in ('cube','prism','cylinder','sphere')),
  game_type text not null default 'spin' check (game_type in ('spin','fold')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classroom_id, slug)
);

create index if not exists solidlab_topics_classroom_idx
  on public.solidlab_topics(classroom_id, is_published, sort_order, created_at);

create table if not exists public.solidlab_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.solidlab_topics(id) on delete cascade,
  game_type text not null default 'spin' check (game_type in ('spin','fold')),
  prompt text not null check (length(trim(prompt)) between 1 and 2000),
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  answer text not null,
  hint text not null default '',
  explanation text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, prompt)
);

create index if not exists solidlab_questions_topic_idx
  on public.solidlab_questions(topic_id, is_active, sort_order, created_at);

create table if not exists public.solidlab_scores (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  topic_id uuid not null references public.solidlab_topics(id) on delete cascade,
  question_id uuid not null references public.solidlab_questions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  points integer not null default 0 check (points between 0 and 10),
  is_correct boolean not null default false,
  selected_answer text not null default '',
  answered_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create index if not exists solidlab_scores_classroom_idx
  on public.solidlab_scores(classroom_id, student_id, topic_id);

-- หน้าแต่ละหน้าของสไลด์แบบการ์ตูน ใช้ learning_materials เดิมเป็นหัวเรื่อง
create table if not exists public.slide_pages (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  page_no integer not null check (page_no > 0),
  storage_path text not null,
  original_file_name text not null default '',
  mime_type text not null default 'image/jpeg',
  created_at timestamptz not null default now(),
  unique (material_id, page_no)
);

create index if not exists slide_pages_material_idx
  on public.slide_pages(material_id, page_no);

-- ทุกอย่างเข้าผ่าน Server Routes เท่านั้น เพื่อไม่เปิดเฉลย/คะแนน/ไฟล์ดิบให้ Browser เขียนตรง
alter table public.solidlab_topics enable row level security;
alter table public.solidlab_questions enable row level security;
alter table public.solidlab_scores enable row level security;
alter table public.slide_pages enable row level security;

revoke all on public.solidlab_topics from anon, authenticated;
revoke all on public.solidlab_questions from anon, authenticated;
revoke all on public.solidlab_scores from anon, authenticated;
revoke all on public.slide_pages from anon, authenticated;
