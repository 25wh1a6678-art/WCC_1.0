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

-- 9. COMMITMENTS TABLE (V3)
create table if not exists public.commitments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    task_id uuid not null references public.tasks(id) on delete cascade,
    duration_minutes integer not null check (duration_minutes > 0),
    status text not null check (status in ('scheduled', 'active', 'completed', 'rescheduled', 'abandoned')) default 'active',
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.commitments is 'Student focus commitments binding specific tasks to focused time blocks';

create index if not exists idx_commitments_user_id on public.commitments(user_id);
create index if not exists idx_commitments_task_id on public.commitments(task_id);
create index if not exists idx_commitments_status on public.commitments(status);
create index if not exists idx_commitments_created_at on public.commitments(created_at desc);

drop trigger if exists set_commitments_updated_at on public.commitments;
create trigger set_commitments_updated_at
    before update on public.commitments
    for each row
    execute function public.handle_updated_at();

-- COMMITMENTS RLS POLICIES
alter table public.commitments enable row level security;

drop policy if exists "Users can view their own commitments" on public.commitments;
create policy "Users can view their own commitments"
    on public.commitments for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own commitments" on public.commitments;
create policy "Users can create their own commitments"
    on public.commitments for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own commitments" on public.commitments;
create policy "Users can update their own commitments"
    on public.commitments for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own commitments" on public.commitments;
create policy "Users can delete their own commitments"
    on public.commitments for delete
    using (auth.uid() = user_id);

-- 10. REWARD SYSTEM (V5)
create table if not exists public.focuscoin_wallets (
    user_id uuid primary key references public.users(id) on delete cascade,
    balance integer not null default 0 check (balance >= 0),
    updated_at timestamptz not null default now()
);

create table if not exists public.streaks (
    user_id uuid primary key references public.users(id) on delete cascade,
    current_streak integer not null default 0 check (current_streak >= 0),
    longest_streak integer not null default 0 check (longest_streak >= current_streak),
    last_success_date date,
    recovery_passes integer not null default 0 check (recovery_passes >= 0),
    updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    amount integer not null,
    transaction_type text not null check (
        transaction_type in ('task_completion', 'daily_bonus', 'streak_bonus', 'reward_purchase', 'recovery_used')
    ),
    source_reference text not null,
    description text not null,
    balance_after integer not null check (balance_after >= 0),
    created_at timestamptz not null default now(),
    unique (user_id, source_reference)
);

create index if not exists idx_coin_transactions_user_created
    on public.coin_transactions(user_id, created_at desc);

create table if not exists public.reward_inventory (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    reward_key text not null,
    reward_name text not null,
    reward_type text not null check (
        reward_type in ('break_pass', 'theme', 'streak_recovery_pass', 'badge')
    ),
    purchased_at timestamptz not null default now()
);

create index if not exists idx_reward_inventory_user_purchased
    on public.reward_inventory(user_id, purchased_at desc);

alter table public.focuscoin_wallets enable row level security;
alter table public.streaks enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.reward_inventory enable row level security;

drop policy if exists "Users can view their own FocusCoin wallets" on public.focuscoin_wallets;
create policy "Users can view their own FocusCoin wallets"
    on public.focuscoin_wallets for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own streaks" on public.streaks;
create policy "Users can view their own streaks"
    on public.streaks for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own coin transactions" on public.coin_transactions;
create policy "Users can view their own coin transactions"
    on public.coin_transactions for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own reward inventory" on public.reward_inventory;
create policy "Users can view their own reward inventory"
    on public.reward_inventory for select using (auth.uid() = user_id);

create or replace function public.complete_commitment_with_rewards(
    p_commitment_id uuid,
    p_auto_complete_task boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_commitment public.commitments%rowtype;
    v_today date := (now() at time zone 'utc')::date;
    v_gap integer;
    v_base_reward integer := 0;
    v_requested integer;
    v_award integer;
    v_today_earned integer := 0;
    v_balance integer;
    v_initial_balance integer;
    v_streak public.streaks%rowtype;
    v_updated public.commitments%rowtype;
    v_reference text;
    v_task_reward_eligible boolean;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    select * into v_commitment
      from public.commitments
     where id = p_commitment_id and user_id = v_user_id
     for update;

    if not found then
        raise exception 'Commitment not found';
    end if;

    if v_commitment.status = 'completed' then
        return jsonb_build_object('commitment', to_jsonb(v_commitment), 'already_completed', true);
    end if;
    if v_commitment.status <> 'active' then
        raise exception 'Only an active commitment can be completed';
    end if;

    select (
        status <> 'completed' or completed_at is null or completed_at >= v_commitment.started_at
    ) into v_task_reward_eligible
      from public.tasks
     where id = v_commitment.task_id and user_id = v_user_id
     for update;
    if not found then
        raise exception 'Commitment task not found';
    end if;

    update public.commitments
       set status = 'completed', completed_at = now(), updated_at = now()
     where id = p_commitment_id and user_id = v_user_id
     returning * into v_updated;

    if p_auto_complete_task then
        update public.tasks
           set status = 'completed', completed_at = now(), updated_at = now()
         where id = v_commitment.task_id and user_id = v_user_id;
    end if;

    insert into public.focuscoin_wallets(user_id) values (v_user_id)
        on conflict (user_id) do nothing;
    select balance into v_balance
      from public.focuscoin_wallets where user_id = v_user_id for update;
    v_initial_balance := v_balance;

    insert into public.streaks(user_id) values (v_user_id)
        on conflict (user_id) do nothing;
    select * into v_streak from public.streaks
     where user_id = v_user_id for update;

    if v_streak.last_success_date is null then
        v_streak.current_streak := 1;
    elsif v_streak.last_success_date = v_today then
        null;
    else
        v_gap := v_today - v_streak.last_success_date;
        if v_gap = 1 then
            v_streak.current_streak := v_streak.current_streak + 1;
        elsif v_gap = 2 and v_streak.recovery_passes > 0 then
            v_streak.current_streak := v_streak.current_streak + 1;
            v_streak.recovery_passes := v_streak.recovery_passes - 1;
            insert into public.coin_transactions(
                user_id, amount, transaction_type, source_reference, description, balance_after
            ) values (
                v_user_id, 0, 'recovery_used', 'recovery-used:' || v_today::text,
                'Streak Recovery Pass used', v_balance
            ) on conflict (user_id, source_reference) do nothing;
        else
            v_streak.current_streak := 1;
        end if;
    end if;

    v_streak.last_success_date := v_today;
    v_streak.longest_streak := greatest(v_streak.longest_streak, v_streak.current_streak);
    update public.streaks
       set current_streak = v_streak.current_streak,
           longest_streak = v_streak.longest_streak,
           last_success_date = v_streak.last_success_date,
           recovery_passes = v_streak.recovery_passes,
           updated_at = now()
     where user_id = v_user_id;

    select coalesce(sum(amount), 0) into v_today_earned
      from public.coin_transactions
     where user_id = v_user_id
       and amount > 0
       and (created_at at time zone 'utc')::date = v_today;

    if v_commitment.duration_minutes >= 60 then
        v_base_reward := 50;
    elsif v_commitment.duration_minutes >= 30 then
        v_base_reward := 35;
    elsif v_commitment.duration_minutes >= 15 then
        v_base_reward := 20;
    elsif v_commitment.duration_minutes >= 5 then
        v_base_reward := 10;
    end if;
    if not v_task_reward_eligible then
        v_base_reward := 0;
    end if;

    v_reference := 'task-completion:' || v_commitment.task_id::text;
    if not exists (
        select 1 from public.coin_transactions
         where user_id = v_user_id and source_reference = v_reference
    ) then
        if v_base_reward > 0 then
            v_requested := v_base_reward;
            v_award := least(v_requested, greatest(0, 200 - v_today_earned));
            if v_award > 0 then
                v_balance := v_balance + v_award;
                insert into public.coin_transactions(
                    user_id, amount, transaction_type, source_reference, description, balance_after
                ) values (
                    v_user_id, v_award, 'task_completion', v_reference,
                    'Completed focus contract (' || v_commitment.duration_minutes || ' min)', v_balance
                );
                v_today_earned := v_today_earned + v_award;
            else
                insert into public.coin_transactions(
                    user_id, amount, transaction_type, source_reference, description, balance_after
                ) values (
                    v_user_id, 0, 'task_completion', v_reference,
                    'Task completion reward capped for today', v_balance
                );
            end if;
        else
            insert into public.coin_transactions(
                user_id, amount, transaction_type, source_reference, description, balance_after
            ) values (
                v_user_id, 0, 'task_completion', v_reference,
                case
                    when not v_task_reward_eligible then 'Task completed before focus contract started'
                    else 'Task completion below minimum reward duration'
                end,
                v_balance
            );
        end if;

        if v_base_reward > 0 then
            v_reference := 'daily:' || v_today::text;
            if not exists (
                select 1 from public.coin_transactions
                 where user_id = v_user_id and source_reference = v_reference
            ) then
                v_award := least(25, greatest(0, 200 - v_today_earned));
                if v_award > 0 then
                    v_balance := v_balance + v_award;
                    insert into public.coin_transactions(
                        user_id, amount, transaction_type, source_reference, description, balance_after
                    ) values (
                        v_user_id, v_award, 'daily_bonus', v_reference,
                        'First eligible completed focus contract today', v_balance
                    );
                    v_today_earned := v_today_earned + v_award;
                end if;
            end if;

            v_requested := case v_streak.current_streak
                when 3 then 20 when 7 then 30 when 14 then 40 when 30 then 50 else 0
            end;
            v_reference := 'streak:' || v_today::text || ':' || v_streak.current_streak::text;
            if v_requested > 0 and not exists (
                select 1 from public.coin_transactions
                 where user_id = v_user_id and source_reference = v_reference
            ) then
                v_award := least(v_requested, greatest(0, 200 - v_today_earned));
                if v_award > 0 then
                    v_balance := v_balance + v_award;
                    insert into public.coin_transactions(
                        user_id, amount, transaction_type, source_reference, description, balance_after
                    ) values (
                        v_user_id, v_award, 'streak_bonus', v_reference,
                        v_streak.current_streak::text || '-day streak milestone', v_balance
                    );
                end if;
            end if;
        end if;
    end if;

    update public.focuscoin_wallets set balance = v_balance, updated_at = now()
     where user_id = v_user_id;

    return jsonb_build_object(
        'commitment', to_jsonb(v_updated),
        'awarded', v_balance - v_initial_balance,
        'balance', v_balance,
        'current_streak', v_streak.current_streak,
        'longest_streak', v_streak.longest_streak,
        'recovery_passes', v_streak.recovery_passes
    );
end;
$$;

create or replace function public.purchase_focus_reward(p_reward_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_name text;
    v_type text;
    v_cost integer;
    v_balance integer;
    v_reference text := 'purchase:' || gen_random_uuid()::text;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    select name, reward_type, coin_cost
      into v_name, v_type, v_cost
      from (values
        ('break-pass', '10-Minute Break Pass', 'break_pass', 100),
        ('dashboard-theme', 'Dashboard Theme', 'theme', 100),
        ('streak-recovery', 'Streak Recovery Pass', 'streak_recovery_pass', 250),
        ('focus-badge', 'Focus Badge', 'badge', 150)
      ) as catalog(reward_key, name, reward_type, coin_cost)
     where catalog.reward_key = p_reward_key;
    if not found then
        raise exception 'This reward is not available';
    end if;

    insert into public.focuscoin_wallets(user_id) values (v_user_id)
        on conflict (user_id) do nothing;
    select balance into v_balance
      from public.focuscoin_wallets where user_id = v_user_id for update;
    if v_balance < v_cost then
        raise exception 'Not enough FocusCoins';
    end if;

    v_balance := v_balance - v_cost;
    update public.focuscoin_wallets set balance = v_balance, updated_at = now()
     where user_id = v_user_id;
    insert into public.coin_transactions(
        user_id, amount, transaction_type, source_reference, description, balance_after
    ) values (
        v_user_id, -v_cost, 'reward_purchase', v_reference, 'Purchased ' || v_name, v_balance
    );
    insert into public.reward_inventory(user_id, reward_key, reward_name, reward_type)
    values (v_user_id, p_reward_key, v_name, v_type);

    if v_type = 'streak_recovery_pass' then
        insert into public.streaks as reward_streaks(user_id, recovery_passes) values (v_user_id, 1)
        on conflict (user_id) do update
           set recovery_passes = reward_streaks.recovery_passes + 1,
               updated_at = now();
    end if;

    return jsonb_build_object('balance', v_balance, 'reward_key', p_reward_key);
end;
$$;

revoke all on function public.complete_commitment_with_rewards(uuid, boolean) from public;
revoke all on function public.purchase_focus_reward(text) from public;
grant execute on function public.complete_commitment_with_rewards(uuid, boolean) to authenticated;
grant execute on function public.purchase_focus_reward(text) to authenticated;
