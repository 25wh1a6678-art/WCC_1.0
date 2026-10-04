# Focus Contract (WCC_1.0)

An AI-powered anti-procrastination system for students that listens to what they did / need to do, creates an actionable plan, and then uses commitment-based focus controls to reduce access to distracting websites until the student completes the chosen commitment.

---

## V0: Foundation Setup

V0 provides the deterministic foundation: Next.js App Router, React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, Supabase Auth, Row-Level Security, and complete manual Task Management.

### Core Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide Icons
- **Language**: TypeScript (strict mode)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (with SSR session handling & local demo fallback)
- **State Management**: React Context (`AuthProvider`) & Task Service (`src/lib/tasks.ts`)

---

## Project Structure

```text
WCC_1.0/
├── .env.example                     # Environment variables template
├── .env.local                       # Local development credentials
├── README.md                        # Documentation & setup guide
├── Focus_Contract_Requirements_Documentation.md # Source of truth specifications
├── package.json                     # Scripts & dependencies
├── tsconfig.json                    # TypeScript configuration with @/* alias
├── postcss.config.mjs               # PostCSS with @tailwindcss/postcss
├── supabase/
│   └── schema.sql                   # PostgreSQL schema (users, tasks, RLS, triggers)
├── tests/
│   └── v0-verification.ts           # Automated test suite (38 tests)
└── src/
    ├── app/
    │   ├── layout.tsx               # Root layout with AuthProvider & navigation
    │   ├── page.tsx                 # Student landing page (/)
    │   ├── login/page.tsx           # Authentication login (/login)
    │   ├── signup/page.tsx          # Account registration (/signup)
    │   ├── dashboard/page.tsx       # Student dashboard with metrics (/dashboard)
    │   ├── tasks/page.tsx           # Task CRUD & filter management (/tasks)
    │   ├── focus/page.tsx           # V3 Focus Mode placeholder (/focus)
    │   ├── reflection/page.tsx      # V2 Daily Reflection placeholder (/reflection)
    │   ├── rewards/page.tsx         # V5 Reward System placeholder (/rewards)
    │   ├── api/auth/callback/       # Supabase OAuth callback route
    │   └── globals.css              # Tailwind styles & theme variables
    ├── components/
    │   ├── ui/                      # Reusable components: Button, Card, Input, Badge, Modal, Spinner
    │   ├── layout/                  # Navbar and Footer
    │   ├── tasks/                   # TaskCard, TaskFormModal, TaskFilter
    │   └── common/                  # RoadmapPlaceholder for future milestones
    ├── context/
    │   └── AuthContext.tsx          # Supabase Auth provider + local demo fallback
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts            # Supabase browser client
    │   │   ├── server.ts            # Supabase server client (async cookies)
    │   │   └── middleware.ts        # Supabase middleware session refresh
    │   ├── tasks.ts                 # Task CRUD operations & validation service
    │   └── utils.ts                 # Date and duration formatters
    ├── types/
    │   ├── database.types.ts        # Supabase schema TypeScript definitions
    │   └── task.ts                  # Task models, priorities, and status configs
    └── middleware.ts                # Next.js route protection & session refresh
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note**: If Supabase credentials are not yet configured, the app runs seamlessly in **Local Demo Mode** using browser-isolated storage, allowing instant local testing of all Auth and Task features without crashing.

### 3. Apply Supabase Database Schema

1. Go to your [Supabase Dashboard](https://app.supabase.com).
2. Open the **SQL Editor**.
3. Copy and run the contents of [`supabase/schema.sql`](file:///home/dell/projects/WCC_1.0/supabase/schema.sql).

This creates:
- `public.users` table (synchronized automatically with `auth.users`)
- `public.tasks` table (with check constraints, foreign keys, timestamps, indexes)
- Strict **Row-Level Security (RLS)** ensuring users only access their own data
- Triggers for automatic `updated_at` and `completed_at` timestamps

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 5. Run Verification Tests & Linting

```bash
npm test
npm run lint
npm run build
```

---

## V0 Verification Checklist

- [x] Initialized Next.js 16 with TypeScript and Tailwind CSS
- [x] Configured Supabase Auth (Sign up, Login, Logout, Session handling)
- [x] Protected routes with redirection (`/dashboard`, `/tasks`)
- [x] Created `users` and `tasks` database schema with PostgreSQL RLS
- [x] Implemented Task CRUD (Create, Read, Edit, Delete, Toggle Complete)
- [x] Implemented Task Filters (Status, Priority, Search, Sort)
- [x] Added visual priority badges (`urgent`, `high`, `medium`, `low`) and duration estimates
- [x] Created all 8 required routes (`/`, `/login`, `/signup`, `/dashboard`, `/tasks`, `/focus`, `/reflection`, `/rewards`)
- [x] Preserved modularity for future milestones (AI planning, voice, commitments, browser blocker, streaks, rewards)
