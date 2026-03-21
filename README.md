# CareContact-2.0 — Comprehensive Healthcare Platform

A full-stack healthcare platform built with Next.js 14, Supabase, and Tailwind CSS.
MediPrep AI pre-consultation is fully integrated as the AI Health Consultant feature.

---

## Features

### Patient Portal
- Dashboard with upcoming appointments, AI report, notifications
- Doctor discovery with search and specialty filters
- Appointment booking and management (cancel/reschedule)
- AI Health Consultant (MediPrep) — pre-consultation chat linked to appointments
- Medical records viewer
- Secure messaging with doctors
- Profile management

### Doctor Portal
- Dashboard with today's schedule and stats
- Appointment management (confirm/cancel/complete + notes)
- Patient list with medical history and AI reports
- Schedule management (working hours)
- Secure messaging with patients
- Profile editing

### Admin Panel
- Platform analytics dashboard
- Doctor verification (approve/reject)
- User management (activate/deactivate)

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key   # optional, uses Ollama if not set
OLLAMA_URL=http://localhost:11434           # for local AI
MODEL=qwen2                                 # your Ollama model name
```

### 3. Set up Supabase
1. Create a project at supabase.com
2. Go to SQL Editor
3. Paste and run the entire contents of `careconnect_schema.sql`

### 4. Get API keys

**Supabase:** Project Settings → API → copy Project URL and anon key

**Anthropic (optional):** console.anthropic.com → API Keys → Create Key

**Ollama (free local):** Install from ollama.com, then run `ollama pull qwen2`

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000

---

## Project Structure

```
careconnect/
├── app/
│   ├── login/                    Login page
│   ├── register/
│   │   ├── patient/              Patient registration
│   │   └── doctor/               Doctor registration
│   ├── patient/                  Patient portal (protected)
│   │   ├── dashboard/
│   │   ├── doctors/              Doctor discovery
│   │   ├── appointments/         Book + manage appointments
│   │   ├── ai-consultant/        MediPrep AI chat
│   │   ├── records/              Medical records
│   │   ├── messages/             Doctor messaging
│   │   └── profile/
│   ├── doctor/                   Doctor portal (protected)
│   │   ├── dashboard/
│   │   ├── appointments/
│   │   ├── patients/
│   │   ├── schedule/
│   │   └── profile/
│   ├── doctors/[id]/             Public doctor profile
│   ├── admin/                    Admin panel (protected)
│   │   ├── dashboard/
│   │   ├── verifications/
│   │   └── users/
│   └── api/                      API routes
│       ├── doctors/
│       ├── appointments/
│       └── chat/                 MediPrep AI endpoint
├── components/
│   ├── shared/                   Sidebar, LoadingScreen
│   ├── ai/                       ChatWindow, ReportModal
│   └── patient/                  DoctorCard, AppointmentCard, etc.
├── lib/
│   ├── supabase.js               Browser client
│   ├── supabaseServer.js         Server client
│   ├── utils.js                  MediPrep utilities + PDF generation
│   └── useAuth.js                Auth hook
├── prompts/
│   └── mediprep.js               MediPrep system prompt
├── middleware.js                 Role-based route protection
└── careconnect_schema.sql        Run this in Supabase SQL Editor
```

---

## AI Model

The AI consultant supports two backends:

| Mode | Setup | Quality |
|------|-------|---------|
| **Claude API** | Set `ANTHROPIC_API_KEY` in `.env.local` | Excellent |
| **Ollama (local)** | Set `OLLAMA_URL` and `MODEL` | Good |

If `ANTHROPIC_API_KEY` is set, Claude is used automatically. Otherwise Ollama is used.

---

## Roles

| Role | Registration | Access |
|------|-------------|--------|
| Patient | /register/patient | /patient/* |
| Doctor | /register/doctor (needs admin approval) | /doctor/* |
| Admin | Created manually in Supabase | /admin/* |

### Create an Admin
In Supabase SQL Editor:
```sql
-- After the admin user has signed up normally, run:
update profiles set role = 'admin' where email = 'admin@yourdomain.com';
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo to vercel.com
3. Add environment variables in Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

Note: Ollama won't work on Vercel. Use `ANTHROPIC_API_KEY` for cloud deployment.
