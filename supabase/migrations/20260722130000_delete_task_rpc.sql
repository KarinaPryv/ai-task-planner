-- delete_task RPC (DELETE /api/tasks/:id). A plain client-side .update()
-- setting deleted_at cannot work here: PostgREST always executes
-- UPDATE ... RETURNING * internally regardless of the client's Prefer
-- header, and RETURNING under RLS re-checks the SELECT policy against the
-- *new* row. Since tasks_select_own requires deleted_at is null, the row
-- we just soft-deleted immediately fails that check on RETURNING, and
-- Postgres raises "new row violates row-level security policy" instead of
-- silently returning zero rows. This is the mirror image of why
-- restore_task (20260722120000_soft_delete_tasks.sql) needed to be
-- security definer — same RETURNING-vs-SELECT-policy interaction, opposite
-- direction (visible -> invisible instead of invisible -> visible).
--
-- security definer bypasses RLS, so the WHERE clause below (auth.uid(),
-- ownership, status <> 'done', deleted_at is null) is the sole
-- authorization check for this operation, not a supplement to RLS —
-- callers can invoke this RPC directly, not only through the DELETE route,
-- so the read-only-when-done rule is re-enforced here too. search_path is
-- pinned to the empty string for the same hardening reason as restore_task;
-- every reference is already fully schema-qualified.
create or replace function public.delete_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted public.tasks;
begin
  if v_user_id is null then
    raise exception 'delete_task: authentication required';
  end if;

  update public.tasks
  set deleted_at = now()
  where id = p_task_id
    and user_id = v_user_id
    and status <> 'done'
    and deleted_at is null
  returning * into v_deleted;

  if v_deleted.id is null then
    raise exception 'delete_task: task not found, already deleted, or read-only';
  end if;

  return v_deleted;
end;
$$;

revoke execute on function public.delete_task(uuid) from public;
revoke execute on function public.delete_task(uuid) from anon;
grant execute on function public.delete_task(uuid) to authenticated;
