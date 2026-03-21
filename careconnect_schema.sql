-- ═══════════════════════════════════════════════════════════════
-- CARECONNECT — COMPLETE SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- Drop existing tables (safe re-run)
drop table if exists notifications   cascade;
drop table if exists direct_messages cascade;
drop table if exists conversations   cascade;
drop table if exists medical_records cascade;
drop table if exists ai_messages     cascade;
drop table if exists ai_sessions     cascade;
drop table if exists reviews         cascade;
drop table if exists appointments    cascade;
drop table if exists patients        cascade;
drop table if exists doctors         cascade;
drop table if exists profiles        cascade;

drop trigger   if exists on_auth_user_created on auth.users;
drop function  if exists handle_new_user();

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  email       text,
  role        text default 'patient' check (role in ('patient','doctor','admin')),
  phone       text,
  avatar_url  text,
  is_active   boolean default true,
  created_at  timestamp default now(),
  updated_at  timestamp default now()
);

create table doctors (
  id                uuid references profiles(id) on delete cascade primary key,
  specialty         text,
  license_number    text,
  verified          boolean default false,
  experience_yrs    integer default 0,
  bio               text,
  consultation_fee  decimal default 0,
  location_text     text,
  location_lat      float,
  location_lng      float,
  available         boolean default true,
  rejection_reason  text,
  working_hours     jsonb default '{}',
  created_at        timestamp default now()
);

create table patients (
  id                  uuid references profiles(id) on delete cascade primary key,
  date_of_birth       date,
  blood_type          text,
  allergies           text[] default '{}',
  chronic_conditions  text[] default '{}',
  emergency_contact   jsonb  default '{}',
  created_at          timestamp default now()
);

create table appointments (
  id             uuid default gen_random_uuid() primary key,
  patient_id     uuid references patients(id) on delete cascade,
  doctor_id      uuid references doctors(id)  on delete cascade,
  scheduled_at   timestamp,
  duration_mins  integer default 30,
  status         text default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  notes          text,
  created_at     timestamp default now()
);

create table reviews (
  id             uuid default gen_random_uuid() primary key,
  patient_id     uuid references patients(id) on delete cascade,
  doctor_id      uuid references doctors(id)  on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  rating         integer check (rating >= 1 and rating <= 5),
  feedback       text,
  created_at     timestamp default now(),
  unique(patient_id, appointment_id)
);

create table ai_sessions (
  id             uuid default gen_random_uuid() primary key,
  patient_id     uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  status         text default 'in_progress' check (status in ('in_progress','completed')),
  report_url     text,
  created_at     timestamp default now()
);

create table ai_messages (
  id         uuid default gen_random_uuid() primary key,
  session_id uuid references ai_sessions(id) on delete cascade,
  role       text check (role in ('user','assistant')),
  content    text,
  created_at timestamp default now()
);

create table medical_records (
  id          uuid default gen_random_uuid() primary key,
  patient_id  uuid references patients(id) on delete cascade,
  doctor_id   uuid references doctors(id)  on delete set null,
  type        text check (type in ('prescription','lab_report','scan','ai_report','other')),
  file_url    text,
  description text,
  created_at  timestamp default now()
);

create table conversations (
  id         uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id  uuid references doctors(id)  on delete cascade,
  created_at timestamp default now(),
  unique(patient_id, doctor_id)
);

create table direct_messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id       uuid references profiles(id) on delete cascade,
  content         text,
  read            boolean default false,
  created_at      timestamp default now()
);

create table notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade,
  type       text check (type in ('appointment','message','reminder','verification','record','review')),
  title      text,
  body       text,
  read       boolean default false,
  created_at timestamp default now()
);

-- ─────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'patient');

  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    user_role,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  if user_role = 'patient' then
    insert into public.patients (id) values (new.id);
  end if;

  if user_role = 'doctor' then
    insert into public.doctors (
      id, specialty, license_number, experience_yrs,
      bio, consultation_fee, location_text
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data->>'specialty', ''),
      coalesce(new.raw_user_meta_data->>'license_number', ''),
      coalesce((new.raw_user_meta_data->>'experience_yrs')::integer, 0),
      coalesce(new.raw_user_meta_data->>'bio', ''),
      coalesce((new.raw_user_meta_data->>'consultation_fee')::decimal, 0),
      coalesce(new.raw_user_meta_data->>'location_text', '')
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table profiles        enable row level security;
alter table doctors         enable row level security;
alter table patients        enable row level security;
alter table appointments    enable row level security;
alter table reviews         enable row level security;
alter table ai_sessions     enable row level security;
alter table ai_messages     enable row level security;
alter table medical_records enable row level security;
alter table conversations   enable row level security;
alter table direct_messages enable row level security;
alter table notifications   enable row level security;

-- Profiles
create policy "Users view own profile"      on profiles for select using (auth.uid() = id);
create policy "Users update own profile"    on profiles for update using (auth.uid() = id);
create policy "Doctors are public"          on profiles for select using (role = 'doctor');
create policy "Admins view all profiles"    on profiles for select using (exists(select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Doctors
create policy "Verified doctors are public" on doctors for select using (verified = true);
create policy "Doctors update own record"   on doctors for update using (auth.uid() = id);
create policy "Admins manage doctors"       on doctors for all using (exists(select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Patients
create policy "Patients view own record"    on patients for select using (auth.uid() = id);
create policy "Patients update own record"  on patients for update using (auth.uid() = id);
create policy "Doctors view their patients" on patients for select using (exists(select 1 from appointments where appointments.patient_id = patients.id and appointments.doctor_id = auth.uid()));

-- Appointments
create policy "Patients view own appts"     on appointments for select using (auth.uid() = patient_id);
create policy "Patients create appts"       on appointments for insert with check (auth.uid() = patient_id);
create policy "Patients update own appts"   on appointments for update using (auth.uid() = patient_id);
create policy "Doctors view own appts"      on appointments for select using (auth.uid() = doctor_id);
create policy "Doctors update own appts"    on appointments for update using (auth.uid() = doctor_id);

-- Reviews
create policy "Reviews are public"          on reviews for select using (true);
create policy "Patients create reviews"     on reviews for insert with check (auth.uid() = patient_id);
create policy "Patients update own reviews" on reviews for update using (auth.uid() = patient_id);
create policy "Patients delete own reviews" on reviews for delete using (auth.uid() = patient_id);

-- AI Sessions
create policy "Patients manage own sessions" on ai_sessions for all using (auth.uid() = patient_id);
create policy "Doctors view linked sessions" on ai_sessions for select using (exists(select 1 from appointments where appointments.id = ai_sessions.appointment_id and appointments.doctor_id = auth.uid()));

-- AI Messages
create policy "Session owners manage messages" on ai_messages for all using (exists(select 1 from ai_sessions where ai_sessions.id = ai_messages.session_id and ai_sessions.patient_id = auth.uid()));

-- Medical Records
create policy "Patients view own records"   on medical_records for select using (auth.uid() = patient_id);
create policy "Doctors insert records"      on medical_records for insert with check (auth.uid() = doctor_id);
create policy "Doctors view own uploads"    on medical_records for select using (auth.uid() = doctor_id);

-- Conversations
create policy "Patients view own convs"     on conversations for select using (auth.uid() = patient_id);
create policy "Doctors view own convs"      on conversations for select using (auth.uid() = doctor_id);
create policy "Patients create convs"       on conversations for insert with check (auth.uid() = patient_id);

-- Direct Messages
create policy "Members view messages"       on direct_messages for select using (exists(select 1 from conversations where conversations.id = direct_messages.conversation_id and (conversations.patient_id = auth.uid() or conversations.doctor_id = auth.uid())));
create policy "Members send messages"       on direct_messages for insert with check (auth.uid() = sender_id);
create policy "Members mark read"           on direct_messages for update using (exists(select 1 from conversations where conversations.id = direct_messages.conversation_id and (conversations.patient_id = auth.uid() or conversations.doctor_id = auth.uid())));

-- Notifications
create policy "Users view own notifs"       on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifs"     on notifications for update using (auth.uid() = user_id);
create policy "System inserts notifs"       on notifications for insert with check (true);

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public) values
  ('reports', 'reports', true),
  ('records', 'records', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Reports bucket policies
create policy "Patients upload own reports"  on storage.objects for insert with check (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Reports are publicly readable" on storage.objects for select using (bucket_id = 'reports');

-- Records bucket policies
create policy "Doctors upload records"       on storage.objects for insert with check (bucket_id = 'records' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Patients read own records"    on storage.objects for select using (bucket_id = 'records' and auth.uid()::text = (storage.foldername(name))[2]);
create policy "Doctors read own uploads"     on storage.objects for select using (bucket_id = 'records' and auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars bucket policies
create policy "Users upload own avatar"      on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Avatars are public"           on storage.objects for select using (bucket_id = 'avatars');
create policy "Users update own avatar"      on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
