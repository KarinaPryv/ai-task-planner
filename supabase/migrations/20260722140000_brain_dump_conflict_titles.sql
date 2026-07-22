-- Fix: time_conflict warnings could reference a task that isn't part of
-- the current batch's tasks[] (e.g. an already-confirmed task), which the
-- client had no way to resolve a title for, so the conflict badge silently
-- never rendered. The RPC already has both tasks' titles when it detects
-- the conflict, so include them directly in the warning instead of making
-- the client re-derive them from batch.tasks.
create or replace function public.create_brain_dump_with_tasks(
  p_raw_text text,
  p_tasks jsonb,
  p_idempotency_key text,
  p_endpoint text
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_brain_dump_entry_id uuid;
  v_brain_dump_entry jsonb;
  v_tasks_result jsonb;
  v_warnings jsonb;
  v_response jsonb;
begin
  perform 1
  from public.idempotency_keys
  where user_id = v_user_id
    and key = p_idempotency_key
    and endpoint = p_endpoint
    and status = 'processing'
  for update;

  if not found then
    raise exception
      'idempotency_keys: no processing record for user_id=%, key=%, endpoint=%',
      v_user_id, p_idempotency_key, p_endpoint;
  end if;

  insert into public.brain_dump_entries (user_id, raw_text)
  values (v_user_id, p_raw_text)
  returning to_jsonb(brain_dump_entries) into v_brain_dump_entry;

  v_brain_dump_entry_id := (v_brain_dump_entry->>'id')::uuid;

  with numbered as (
    select
      elem as task,
      ord - 1 as arr_index
    from jsonb_array_elements(p_tasks) with ordinality as t(elem, ord)
  ),
  ranked as (
    select
      task,
      (task->>'scheduled_date')::date as scheduled_date,
      nullif(task->>'scheduled_time', '')::time as scheduled_time,
      row_number() over (
        partition by (task->>'scheduled_date')
        order by
          (nullif(task->>'scheduled_time', '') is null) asc,
          nullif(task->>'scheduled_time', '')::time asc nulls last,
          arr_index asc
      ) - 1 as computed_sort_order
    from numbered
  ),
  inserted as (
    insert into public.tasks (
      user_id, brain_dump_entry_id, title, description, priority,
      priority_is_suggestion, duration_minutes, duration_is_suggestion,
      scheduled_date, scheduled_time, status, sort_order
    )
    select
      v_user_id,
      v_brain_dump_entry_id,
      task->>'title',
      task->>'description',
      (task->>'priority')::task_priority,
      (task->>'priority_is_suggestion')::boolean,
      (task->>'duration_minutes')::integer,
      (task->>'duration_is_suggestion')::boolean,
      scheduled_date,
      scheduled_time,
      'draft',
      computed_sort_order
    from ranked
    returning *
  )
  select jsonb_agg(to_jsonb(inserted) - 'user_id' order by scheduled_date, sort_order)
  into v_tasks_result
  from inserted;

  -- Warnings are computed here, inside the same transaction as task
  -- creation and the idempotency-key completion below, so that a replayed
  -- request with the same Idempotency-Key always returns the exact original
  -- warnings (UX Specification SS6.5: warnings are computed once, at
  -- creation time, and never recalculated).
  --
  -- day_overload: sum of duration_minutes across confirmed (existing) +
  -- newly created draft tasks, per unique scheduled_date, > 480 minutes.
  --
  -- time_conflict: one warning per pair of tasks (from the same candidate
  -- set as day_overload: confirmed + new draft) sharing a scheduled_date,
  -- both having a scheduled_time, whose intervals overlap. task_titles is
  -- carried alongside task_ids so the client can render the conflict even
  -- when one side is an already-confirmed task that isn't part of this
  -- response's tasks[] (see group-batches.ts).
  with touched_dates as (
    select distinct (task->>'scheduled_date')::date as scheduled_date
    from jsonb_array_elements(p_tasks) as task
  ),
  new_tasks as (
    select
      (t->>'id')::uuid as id,
      t->>'title' as title,
      (t->>'scheduled_date')::date as scheduled_date,
      nullif(t->>'scheduled_time', '')::time as scheduled_time,
      (t->>'duration_minutes')::integer as duration_minutes
    from jsonb_array_elements(v_tasks_result) as t
  ),
  candidates as (
    select id, title, scheduled_date, scheduled_time, duration_minutes
    from public.tasks
    where user_id = v_user_id
      and status = 'confirmed'
      and scheduled_date in (select scheduled_date from touched_dates)
    union all
    select id, title, scheduled_date, scheduled_time, duration_minutes from new_tasks
  ),
  day_totals as (
    select scheduled_date, sum(duration_minutes) as total_minutes
    from candidates
    group by scheduled_date
  ),
  overload_warnings as (
    select jsonb_build_object(
      'type', 'day_overload',
      'scheduled_date', scheduled_date,
      'total_minutes', total_minutes
    ) as w
    from day_totals
    where total_minutes > 480
  ),
  timed as (
    select id, title, scheduled_date, scheduled_time, duration_minutes
    from candidates
    where scheduled_time is not null
  ),
  conflict_pairs as (
    select distinct
      a.scheduled_date,
      least(a.id, b.id) as id1,
      greatest(a.id, b.id) as id2,
      case when a.id < b.id then a.title else b.title end as title1,
      case when a.id < b.id then b.title else a.title end as title2
    from timed a
    join timed b
      on a.scheduled_date = b.scheduled_date
      and a.id < b.id
      and a.scheduled_time < b.scheduled_time + make_interval(mins => b.duration_minutes)
      and b.scheduled_time < a.scheduled_time + make_interval(mins => a.duration_minutes)
  ),
  conflict_warnings as (
    select jsonb_build_object(
      'type', 'time_conflict',
      'scheduled_date', scheduled_date,
      'task_ids', jsonb_build_array(id1, id2),
      'task_titles', jsonb_build_array(title1, title2)
    ) as w
    from conflict_pairs
  )
  select coalesce(jsonb_agg(w), '[]'::jsonb)
  into v_warnings
  from (select w from overload_warnings union all select w from conflict_warnings) all_w;

  v_response := jsonb_build_object(
    'brainDumpEntry', v_brain_dump_entry - 'user_id',
    'tasks', v_tasks_result,
    'warnings', v_warnings
  );

  update public.idempotency_keys
  set status = 'completed', response_status = 201, response_body = v_response
  where user_id = v_user_id
    and key = p_idempotency_key
    and endpoint = p_endpoint
    and status = 'processing';

  if not found then
    raise exception
      'idempotency_keys: failed to mark completed for user_id=%, key=%, endpoint=%',
      v_user_id, p_idempotency_key, p_endpoint;
  end if;

  return v_response;
end;
$$;
