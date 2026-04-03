-- ============================================================
-- YANA — Biological Machine Architecture
-- Supabase PostgreSQL Relational Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── 1. Users / Roots ───────────────────────────────────────
create table users (
  id            uuid primary key default uuid_generate_v4(),
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

-- ─── 3. Key Results (Macro Milestones) ──────────────────────
create type kr_status as enum ('on-track', 'at-risk', 'behind');

create table key_results (
  id            uuid primary key default uuid_generate_v4(),
  north_star_id uuid not null references north_stars(id) on delete cascade,
  title         text not null,
  progress      numeric(5,2) not null default 0,
  status        kr_status not null default 'on-track',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_kr_ns on key_results(north_star_id);

-- ─── 4. Objectives (Mid-range / Professional Engine) ────────
create type objective_tier as enum ('Decade', 'Year', 'Quarter', 'Month');

create table objectives (
  id            uuid primary key default uuid_generate_v4(),
  key_result_id uuid not null references key_results(id) on delete cascade,
  tier          objective_tier not null default 'Quarter',
  title         text not null,
  progress      numeric(5,2) not null default 0,
  status        kr_status not null default 'on-track',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_obj_kr on objectives(key_result_id);

-- ─── 5. Tasks (Micro / Production Engine) ───────────────────
create type task_status as enum ('todo', 'in_progress', 'done', 'cancelled');

create table tasks (
  id            uuid primary key default uuid_generate_v4(),
  objective_id  uuid not null references objectives(id) on delete cascade,
  title         text not null,
  description   text,
  status        task_status not null default 'todo',
  actual_min    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_task_obj on tasks(objective_id);

-- ─── 6. Time Blocks (Micro / Tactical Gearbox) ──────────────
create table time_blocks (
  id            uuid primary key default uuid_generate_v4(),
  objective_id  uuid not null references objectives(id) on delete cascade,
  task_id       uuid references tasks(id) on delete set null,
  title         text not null,
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  is_deep_work  boolean not null default false, -- Drives 'F' (Focus Quality)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tb_obj on time_blocks(objective_id);

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
