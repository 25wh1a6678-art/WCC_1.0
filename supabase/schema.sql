-- ==============================================================================
-- FOCUS CONTRACT: V0 FOUNDATION DATABASE SCHEMA
-- PostgreSQL schema for Supabase
-- ==============================================================================

-- 1. Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. USERS TABLE
-- Stores student profile information linked to Supabase Auth
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text unique,
    created_at timestamptz not null default now()
);

comment on table public.users is 'Student user profiles linked to Supabase auth';

-- 3. TASKS TABLE
-- Stores manual and upcoming AI tasks for student productivity
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null check (char_length(trim(title)) > 0),
    description text,
    priority text not null check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
    estimated_minutes integer not null check (estimated_minutes > 0) default 25,
    deadline timestamptz,
    status text not null check (status in ('pending', 'in_progress', 'completed', 'cancelled')) default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

comment on table public.tasks is 'Student tasks with priority, duration estimates, deadlines, and status';

-- 4. INDEXES
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_created_at on public.tasks(created_at desc);

-- 5. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    -- Automatically set completed_at when status changes to completed
    if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
        new.completed_at = now();
    elsif new.status <> 'completed' then
        new.completed_at = null;
    end if;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
    before update on public.tasks
    for each row
    execute function public.handle_updated_at();

-- 6. AUTOMATIC AUTH USER SYNC TRIGGER
-- Automatically copies newly registered auth.users into public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.users (id, name, email, created_at)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        now()
    )
    on conflict (id) do update
    set
        name = coalesce(excluded.name, public.users.name),
        email = coalesce(excluded.email, public.users.email);
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update on auth.users
    for each row
    execute function public.handle_new_user();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user ownership enforcement: users can NEVER access or mutate other users' data
alter table public.users enable row level security;
alter table public.tasks enable row level security;

-- USERS POLICIES
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
    on public.users for select
    using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
    on public.users for update
    using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
    on public.users for insert
    with check (auth.uid() = id);

-- TASKS POLICIES
drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
    on public.tasks for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
    on public.tasks for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
    on public.tasks for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
    on public.tasks for delete
    using (auth.uid() = user_id);

-- 8. DAILY_REFLECTIONS TABLE (V2)
create table if not exists public.daily_reflections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    reflection_text text not null check (char_length(trim(reflection_text)) > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.daily_reflections is 'Student daily reflections transcribed from voice or typed text';

create index if not exists idx_daily_reflections_user_id on public.daily_reflections(user_id);
create index if not exists idx_daily_reflections_created_at on public.daily_reflections(created_at desc);

drop trigger if exists set_daily_reflections_updated_at on public.daily_reflections;
create trigger set_daily_reflections_updated_at
    before update on public.daily_reflections
    for each row
    execute function public.handle_updated_at();

-- DAILY REFLECTIONS RLS POLICIES
alter table public.daily_reflections enable row level security;

drop policy if exists "Users can view their own reflections" on public.daily_reflections;
create policy "Users can view their own reflections"
    on public.daily_reflections for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own reflections" on public.daily_reflections;
create policy "Users can create their own reflections"
    on public.daily_reflections for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reflections" on public.daily_reflections;
create policy "Users can update their own reflections"
    on public.daily_reflections for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own reflections" on public.daily_reflections;
create policy "Users can delete their own reflections"
    on public.daily_reflections for delete
    using (auth.uid() = user_id);
