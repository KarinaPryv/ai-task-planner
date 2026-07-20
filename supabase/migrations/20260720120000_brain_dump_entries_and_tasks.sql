-- brain_dump_entries and tasks tables, ENUM types, indexes, triggers,
-- and RLS policies (Increment 6: Core Tasks Schema).

create type public.task_priority as enum ('low', 'medium', 'high');
create type public.task_status as enum ('draft', 'confirmed', 'done');

create table public.brain_dump_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  raw_text text not null,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  brain_dump_entry_id uuid not null,
  title text not null,
  description text,
  priority public.task_priority not null,
  priority_is_suggestion boolean not null default false,
  duration_minutes integer not null check (duration_minutes > 0),
  duration_is_suggestion boolean not null default false,
  scheduled_date date not null,
  scheduled_time time,
  status public.task_status not null default 'draft',
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (brain_dump_entry_id, user_id)
    references public.brain_dump_entries (id, user_id)
);

-- Today's Plan / Calendar: filter by user_id + status + scheduled_date,
-- ordered by sort_order (PRD §9, §12).
create index tasks_today_plan_idx
  on public.tasks (user_id, status, scheduled_date, sort_order);

-- Drafts: filter by user_id + status = 'draft', ordered by created_at desc
-- (UX Specification §7.2).
create index tasks_drafts_idx
  on public.tasks (user_id, status, created_at);

-- Confirm-remaining: filter directly by brain_dump_entry_id (PRD §3.4).
-- Postgres does not auto-index the referencing side of a foreign key.
create index tasks_brain_dump_entry_id_idx
  on public.tasks (brain_dump_entry_id);

-- Reuse the existing immutable-user_id trigger function, defined in
-- 20260719120000_user_settings.sql.
create trigger brain_dump_entries_prevent_user_id_update
  before update on public.brain_dump_entries
  for each row
  execute function public.prevent_user_id_update();

create trigger tasks_prevent_user_id_update
  before update on public.tasks
  for each row
  execute function public.prevent_user_id_update();

create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.tasks
  for each row
  execute function public.trigger_set_updated_at();

alter table public.brain_dump_entries enable row level security;
alter table public.tasks enable row level security;

create policy "brain_dump_entries_select_own"
  on public.brain_dump_entries
  for select
  using (user_id = auth.uid());

create policy "brain_dump_entries_insert_own"
  on public.brain_dump_entries
  for insert
  with check (user_id = auth.uid());

create policy "brain_dump_entries_update_own"
  on public.brain_dump_entries
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "brain_dump_entries_delete_own"
  on public.brain_dump_entries
  for delete
  using (user_id = auth.uid());

create policy "tasks_select_own"
  on public.tasks
  for select
  using (user_id = auth.uid());

create policy "tasks_insert_own"
  on public.tasks
  for insert
  with check (user_id = auth.uid());

create policy "tasks_update_own"
  on public.tasks
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tasks_delete_own"
  on public.tasks
  for delete
  using (user_id = auth.uid());
