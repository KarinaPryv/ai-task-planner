-- user_settings table, RLS policies, and automatic creation on new auth user.

create table public.user_settings (
  user_id uuid primary key references auth.users (id),
  timezone text not null default 'UTC'
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings
  for select
  using (user_id = auth.uid());

create policy "user_settings_insert_own"
  on public.user_settings
  for insert
  with check (user_id = auth.uid());

create policy "user_settings_update_own"
  on public.user_settings
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_settings_delete_own"
  on public.user_settings
  for delete
  using (user_id = auth.uid());

-- Immutable user_id: reusable across user_settings / brain_dump_entries / tasks.
create or replace function public.prevent_user_id_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end;
$$;

create trigger user_settings_prevent_user_id_update
  before update on public.user_settings
  for each row
  execute function public.prevent_user_id_update();

-- Auto-create a user_settings row for every new auth user
-- (covers both email+password and Google OAuth sign-up).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id, timezone)
  values (new.id, 'UTC')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
