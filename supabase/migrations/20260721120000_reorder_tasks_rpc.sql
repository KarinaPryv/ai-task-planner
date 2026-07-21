-- reorder_tasks RPC (Today's Plan drag&drop, Architecture.md §Reorder).
--
-- Requires the full set of the caller's confirmed tasks for target_date in
-- p_items (TodayPlanList always sends the whole reordered active array, never
-- a partial diff — see handleReorder in TodayPlanList.tsx). This is not just
-- a convenience: without it, a duplicate id in p_items would make the final
-- UPDATE ... FROM join two item rows to the same target row, leaving the
-- winner unspecified. Requiring (and validating) the full list lets us also
-- enforce that item ids are distinct, which rules that out entirely.

create or replace function public.reorder_tasks(
  p_items jsonb,
  p_target_date date
)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_count integer;
  v_distinct_id_count integer;
  v_distinct_sort_order_count integer;
  v_matching_task_count integer;
  v_total_task_count integer;
begin
  if v_user_id is null then
    raise exception 'reorder_tasks: authentication required';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'reorder_tasks: p_items must be an array';
  end if;

  select
    count(*),
    count(distinct (item->>'id')::uuid),
    count(distinct (item->>'sort_order')::integer)
  into
    v_item_count,
    v_distinct_id_count,
    v_distinct_sort_order_count
  from jsonb_array_elements(p_items) as item;

  if v_item_count = 0 then
    return;
  end if;

  select count(*) into v_total_task_count
  from public.tasks
  where user_id = v_user_id
    and status = 'confirmed'
    and scheduled_date = p_target_date;

  if v_item_count <> v_total_task_count then
    raise exception
      'reorder_tasks: request must contain all confirmed tasks for target_date';
  end if;

  if v_distinct_id_count <> v_item_count then
    raise exception 'reorder_tasks: task ids must be unique';
  end if;

  if v_distinct_sort_order_count <> v_item_count then
    raise exception 'reorder_tasks: sort_order values must be unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    where (item->>'sort_order')::integer < 0
       or (item->>'sort_order')::integer >= v_item_count
  ) then
    raise exception
      'reorder_tasks: sort_order values must form a zero-based sequence';
  end if;

  select count(*) into v_matching_task_count
  from public.tasks t
  join jsonb_array_elements(p_items) as item
    on t.id = (item->>'id')::uuid
  where t.user_id = v_user_id
    and t.status = 'confirmed'
    and t.scheduled_date = p_target_date;

  if v_matching_task_count <> v_item_count then
    raise exception
      'reorder_tasks: all items must belong to the caller, be confirmed, and be scheduled on target_date';
  end if;

  update public.tasks as t
  set sort_order = (item->>'sort_order')::integer
  from jsonb_array_elements(p_items) as item
  where t.id = (item->>'id')::uuid;
end;
$$;

revoke execute on function public.reorder_tasks(jsonb, date) from public;
revoke execute on function public.reorder_tasks(jsonb, date) from anon;
grant execute on function public.reorder_tasks(jsonb, date) to authenticated;
