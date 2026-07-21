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
  // taskId -> the title of the other task it conflicts with. Built fresh
  // from the batch's *current* tasks on every call, so a conflict-note
  // silently disappears once either side of the pair is confirmed/deleted
  // — without ever re-running the overlap detection itself.
  conflictTitleByTaskId: Map<string, string>;
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

  const conflictTitleByTaskId = new Map<string, string>();

  for (const warning of batch.warnings) {
    if (warning.type !== "time_conflict") continue;

    const [id1, id2] = warning.task_ids;
    const task1 = batch.tasks.find((task) => task.id === id1);
    const task2 = batch.tasks.find((task) => task.id === id2);

    if (task1 && task2) {
      conflictTitleByTaskId.set(id1, task2.title);
      conflictTitleByTaskId.set(id2, task1.title);
    }
  }

  return { brainDumpEntry: batch.brainDumpEntry, dateGroups, conflictTitleByTaskId };
}
