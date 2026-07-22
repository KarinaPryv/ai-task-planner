import type { Task } from "@/features/tasks/types";
import type { BrainDumpEntry, BrainDumpResponse, DayOverloadWarning } from "../types";

export interface DateGroup {
  date: string;
  tasks: Task[];
  overloadWarning?: DayOverloadWarning;
}

export interface GroupedBatch {
  brainDumpEntry: BrainDumpEntry;
  dateGroups: DateGroup[];
  // taskId -> titles of every other task it conflicts with (TaskCard
  // decides the "with «X»" vs "with N tasks" wording from the array
  // length). Read straight off the warning's conflicts_with — the RPC
  // already groups by task, one warning per conflicting task, not per
  // pair (see types.ts) — not looked up in batch.tasks, since a conflict's
  // other side is often an already-confirmed task that never appears in
  // this batch's tasks[]. Same persistence rule as OverloadBanner (see its
  // comment): a note shows as long as the task it's attached to is still
  // rendered, even after its counterpart is itself confirmed/deleted.
  conflictTitlesByTaskId: Map<string, string[]>;
}

export function groupBatch(batch: BrainDumpResponse): GroupedBatch {
  const byDate = new Map<string, Task[]>();

  for (const task of batch.tasks) {
    const list = byDate.get(task.scheduled_date) ?? [];
    list.push(task);
    byDate.set(task.scheduled_date, list);
  }

  const dateGroups: DateGroup[] = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tasks]) => ({
      date,
      tasks: [...tasks].sort((a, b) => a.sort_order - b.sort_order),
      overloadWarning: batch.warnings.find(
        (warning): warning is DayOverloadWarning =>
          warning.type === "day_overload" && warning.scheduled_date === date,
      ),
    }));

  const conflictTitlesByTaskId = new Map<string, string[]>();

  for (const warning of batch.warnings) {
    if (warning.type !== "time_conflict") continue;

    conflictTitlesByTaskId.set(
      warning.task_id,
      warning.conflicts_with.map((conflict) => conflict.title),
    );
  }

  return { brainDumpEntry: batch.brainDumpEntry, dateGroups, conflictTitlesByTaskId };
}
