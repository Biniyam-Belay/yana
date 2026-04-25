-- ============================================================
-- YANA — Biological Machine Architecture
-- Supabase PostgreSQL Relational Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── 1. Users / Roots ───────────────────────────────────────
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  display_name  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── 2. The North Star (Macro) ──────────────────────────────
-- Only one active North Star per user usually, but keeping it relational.
create table north_stars (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  mission_statement text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_ns_user on north_stars(user_id);
create unique index idx_ns_user_active on north_stars(user_id) where is_active;

-- ─── 3. Key Results (Macro Milestones) ──────────────────────
create type kr_status as enum ('on-track', 'at-risk', 'behind');

create table key_results (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  north_star_id uuid not null references north_stars(id) on delete cascade,
  title         text not null,
  progress      numeric(5,2) not null default 0,
  status        kr_status not null default 'on-track',
  color         text,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_kr_user on key_results(user_id);
create index idx_kr_ns on key_results(north_star_id);

-- ─── 4. Objectives (Mid-range / Professional Engine) ────────
create type objective_tier as enum ('Decade', 'Year', 'Quarter', 'Month');

create table objectives (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  north_star_id uuid not null references north_stars(id) on delete cascade,
  key_result_id uuid references key_results(id) on delete set null,
  tier          objective_tier not null default 'Quarter',
  title         text not null,
  progress      numeric(5,2) not null default 0,
  status        kr_status not null default 'on-track',
  color         text,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_obj_user on objectives(user_id);
create index idx_obj_ns on objectives(north_star_id);
create index idx_obj_kr on objectives(key_result_id);

-- ─── 5. Tasks (Micro / Production Engine) ───────────────────
create type task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
create type timer_mode as enum ('stopwatch', 'countdown');
create type financial_account_type as enum ('liquid', 'investment');
create type financial_priority as enum ('high', 'medium', 'low');
create type tactical_quadrant as enum ('q1', 'q2', 'q3', 'q4');
create type tactical_block_type as enum ('deep-work', 'meeting', 'admin', 'break');

create table tasks (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  objective_id  uuid not null references objectives(id) on delete cascade,
  title         text not null,
  description   text,
  status        task_status not null default 'todo',
  actual_min    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_task_user on tasks(user_id);
create index idx_task_obj on tasks(objective_id);

-- ─── 5b. Objective Key Results (Mid-range telemetry) ───────
create table objective_key_results (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  objective_id  uuid not null references objectives(id) on delete cascade,
  title         text not null,
  progress      numeric(5,2) not null default 0,
  status        kr_status not null default 'on-track',
  color         text,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_objkr_user on objective_key_results(user_id);
create index idx_objkr_obj on objective_key_results(objective_id);

-- ─── 6. Time Blocks (Micro / Tactical Gearbox) ──────────────
create table time_blocks (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  objective_id  uuid not null references objectives(id) on delete cascade,
  task_id       uuid references tasks(id) on delete set null,
  title         text not null,
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  is_deep_work  boolean not null default false, -- Drives 'F' (Focus Quality)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tb_user on time_blocks(user_id);
create index idx_tb_obj on time_blocks(objective_id);

-- ─── 6b. North Star Milestones ──────────────────────────────
create table north_star_milestones (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  title         text not null,
  due_date      date,
  is_done       boolean not null default false,
  completed_at  timestamptz,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_nsm_user on north_star_milestones(user_id);

-- ─── 6c. Focus Timer Sessions ──────────────────────────────
create table focus_timer_sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references users(id) on delete cascade,
  target_kind     text not null check (target_kind in ('general', 'objective', 'kr', 'custom')),
  target_id       uuid,
  target_label    text not null,
  mode            timer_mode not null,
  planned_seconds integer,
  seconds         integer not null default 0,
  completed       boolean not null default false,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  created_at      timestamptz not null default now()
);
create index idx_timer_user_started on focus_timer_sessions(user_id, started_at desc);

-- ─── 7. Financial Log (Runway Fuel) ─────────────────────────
create type transaction_type as enum ('income', 'expense');

create table financials (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  type          transaction_type not null,
  amount        numeric(12,2) not null,
  is_recurring  boolean not null default false,
  date          date not null default current_date,
  created_at    timestamptz not null default now()
);
-- Derives 'S' (Stress Coefficient / Runway buffer)
create index idx_fin_user on financials(user_id);

create table financial_accounts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  type          financial_account_type not null,
  balance       numeric(12,2) not null default 0,
  currency      text not null default 'USD',
  health        integer not null default 0 check (health between 0 and 100),
  icon_type     text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_fin_accounts_user on financial_accounts(user_id);

create table financial_flows (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  type          transaction_type not null,
  amount        numeric(12,2) not null,
  frequency     text not null,
  category      text not null,
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_fin_flows_user on financial_flows(user_id);

create table financial_buckets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  target        numeric(12,2) not null,
  current       numeric(12,2) not null default 0,
  priority      financial_priority not null default 'medium',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_fin_buckets_user on financial_buckets(user_id);

-- ─── 8. Biometric Log (Battery Capacity) ────────────────────
create table biometrics (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  date          date not null default current_date,
  sleep_score   integer check(sleep_score between 0 and 100),
  hydration_l   numeric(4,2),
  nutrition_cal integer,
  created_at    timestamptz not null default now(),
  constraint uq_bio_user_date unique(user_id, date)
);
-- Derives 'H' (System Health)
create index idx_bio_user on biometrics(user_id);

create table biometric_protocols (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  weight        numeric(8,2) not null default 0,
  reps          integer not null default 0,
  sets          integer not null default 0,
  completed     boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_bio_protocols_user on biometric_protocols(user_id);

create table biometric_intakes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  calories      integer not null default 0,
  protein       integer not null default 0,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_bio_intakes_user on biometric_intakes(user_id);

-- ─── 9. Telemetry State (Vm State Cache) ────────────────────
create table telemetry (
  user_id       uuid primary key references users(id) on delete cascade,
  vm_score      numeric(5,2) not null default 0,
  execution_rate numeric(5,2) not null default 0,
  focus_quality numeric(5,2) not null default 0,
  system_health numeric(5,2) not null default 0,
  stress_coeff  numeric(5,2) not null default 0,
  alignment_score numeric(5,2) not null default 0,
  last_calculated timestamptz not null default now()
);

-- ─── 10. Tactical Workspace Persistence ────────────────────
create table tactical_matrix_items (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  quadrant      tactical_quadrant not null,
  title         text not null,
  done          boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tactical_matrix_user on tactical_matrix_items(user_id);

create table tactical_commands (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  title         text not null,
  done          boolean not null default false,
  time_estimate integer,
  objective_id  uuid references objectives(id) on delete set null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tactical_commands_user on tactical_commands(user_id);
create index idx_tactical_commands_objective on tactical_commands(objective_id);

create table tactical_blocks (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  day_offset    integer not null default 0,
  start_hr      numeric(4,2) not null,
  end_hr        numeric(4,2) not null,
  title         text not null,
  type          tactical_block_type not null,
  task_id       uuid,
  objective_id  uuid,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tactical_blocks_user on tactical_blocks(user_id);

create table tactical_inbox_items (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  title         text not null,
  done          boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tactical_inbox_user on tactical_inbox_items(user_id);

-- ─── 11. Professional Workspace Persistence ────────────────
create type professional_task_status as enum ('backlog', 'todo', 'in-progress', 'review', 'done');
create type professional_task_priority as enum ('critical', 'high', 'medium', 'low');

create table professional_tasks (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references users(id) on delete cascade,
  objective_id         uuid references objectives(id) on delete set null,
  project_id           uuid references objective_key_results(id) on delete set null,
  title                text not null,
  description          text,
  status               professional_task_status not null default 'todo',
  priority             professional_task_priority not null default 'medium',
  assignee             text,
  due_date             date,
  tags                 text[] not null default '{}',
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint professional_tasks_project_objective_fk check (
    project_id is null or objective_id is not null
  )
);
create index idx_prof_tasks_user on professional_tasks(user_id);
create index idx_prof_tasks_objective on professional_tasks(objective_id);
create index idx_prof_tasks_project on professional_tasks(project_id);
create index idx_prof_tasks_status on professional_tasks(status);

-- ─── Triggers for timestamps ────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_upd before update on users for each row execute function update_updated_at();
create trigger trg_ns_upd before update on north_stars for each row execute function update_updated_at();
create trigger trg_kr_upd before update on key_results for each row execute function update_updated_at();
create trigger trg_obj_upd before update on objectives for each row execute function update_updated_at();
create trigger trg_task_upd before update on tasks for each row execute function update_updated_at();
create trigger trg_tb_upd before update on time_blocks for each row execute function update_updated_at();
create trigger trg_nsm_upd before update on north_star_milestones for each row execute function update_updated_at();
create trigger trg_timer_upd before update on focus_timer_sessions for each row execute function update_updated_at();
create trigger trg_fin_accounts_upd before update on financial_accounts for each row execute function update_updated_at();
create trigger trg_fin_flows_upd before update on financial_flows for each row execute function update_updated_at();
create trigger trg_fin_buckets_upd before update on financial_buckets for each row execute function update_updated_at();
create trigger trg_bio_protocols_upd before update on biometric_protocols for each row execute function update_updated_at();
create trigger trg_bio_intakes_upd before update on biometric_intakes for each row execute function update_updated_at();
create trigger trg_tactical_matrix_upd before update on tactical_matrix_items for each row execute function update_updated_at();
create trigger trg_tactical_commands_upd before update on tactical_commands for each row execute function update_updated_at();
create trigger trg_tactical_blocks_upd before update on tactical_blocks for each row execute function update_updated_at();
create trigger trg_tactical_inbox_upd before update on tactical_inbox_items for each row execute function update_updated_at();
create trigger trg_professional_tasks_upd before update on professional_tasks for each row execute function update_updated_at();

-- ─── Auth sync and row-level security ───────────────────────
create or replace function sync_auth_user_profile()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_auth_user_sync
after insert or update on auth.users
for each row execute function sync_auth_user_profile();

alter table users enable row level security;
alter table north_stars enable row level security;
alter table key_results enable row level security;
alter table objectives enable row level security;
alter table tasks enable row level security;
alter table time_blocks enable row level security;
alter table north_star_milestones enable row level security;
alter table focus_timer_sessions enable row level security;
alter table financials enable row level security;
alter table financial_accounts enable row level security;
alter table financial_flows enable row level security;
alter table financial_buckets enable row level security;
alter table biometrics enable row level security;
alter table biometric_protocols enable row level security;
alter table biometric_intakes enable row level security;
alter table telemetry enable row level security;
alter table tactical_matrix_items enable row level security;
alter table tactical_commands enable row level security;
alter table tactical_blocks enable row level security;
alter table tactical_inbox_items enable row level security;
alter table professional_tasks enable row level security;

create policy "Users can read their profile" on users
  for select using (id = auth.uid());
create policy "Users can update their profile" on users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Users can manage their north stars" on north_stars
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their key results" on key_results
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their objectives" on objectives
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their tasks" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their time blocks" on time_blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their milestones" on north_star_milestones
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their focus sessions" on focus_timer_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their financial records" on financials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their financial accounts" on financial_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their financial flows" on financial_flows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their financial buckets" on financial_buckets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their biometrics" on biometrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their biometric protocols" on biometric_protocols
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their biometric intakes" on biometric_intakes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their telemetry" on telemetry
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their tactical matrix items" on tactical_matrix_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their tactical commands" on tactical_commands
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their tactical blocks" on tactical_blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their tactical inbox" on tactical_inbox_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage their professional tasks" on professional_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
