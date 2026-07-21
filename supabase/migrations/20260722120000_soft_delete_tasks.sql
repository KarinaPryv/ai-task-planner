-- Soft delete for tasks (Undo toast, UX Specification §8.4). Delete now
-- sets deleted_at instead of removing the row, so Undo can restore it by
-- clearing the column. tasks_select_own is the single enforcement point:
-- every existing SELECT-based query (Today's Plan, Drafts, reorder_tasks'
-- internal counts, the PATCH/complete/reopen "does this task exist"
-- pre-checks) already goes through this policy, so a soft-deleted row
-- disappears everywhere at once with no other code changes.

alter table public.tasks add column deleted_at timestamptz;

drop policy "tasks_select_own" on public.tasks;

create policy "tasks_select_own"
  on public.tasks
  for select
  using (user_id = auth.uid() and deleted_at is null);

-- restore_task RPC (POST /api/tasks/:id/restore). A soft-deleted row is
-- invisible under tasks_select_own above, so the route handler cannot
-- SELECT it first and then UPDATE — there is nothing to select. This RPC
-- is security definer specifically to see past that policy: it runs as
-- the function owner, which bypasses RLS by default, so the WHERE clause
-- below (auth.uid() + ownership + deleted_at is not null) is the *only*
-- authorization check for this operation, not a supplement to RLS.
-- search_path is pinned to the empty string (Supabase's hardened default
-- for security definer functions) so no identifier here can be hijacked by
-- an object earlier in a caller-influenced search_path; every reference is
-- already fully schema-qualified (public.tasks, auth.uid()), so this has
-- no effect on behavior, only on safety.
create or replace function public.restore_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restored public.tasks;
begin
  if v_user_id is null then
    raise exception 'restore_task: authentication required';
  end if;

  update public.tasks
  set deleted_at = null
  where id = p_task_id
    and user_id = v_user_id
    and deleted_at is not null
  returning * into v_restored;

  if v_restored.id is null then
    raise exception 'restore_task: task not found or not deleted';
  end if;

  return v_restored;
end;
$$;

revoke execute on function public.restore_task(uuid) from public;
revoke execute on function public.restore_task(uuid) from anon;
grant execute on function public.restore_task(uuid) to authenticated;
