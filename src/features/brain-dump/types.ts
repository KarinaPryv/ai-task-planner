import type { Task } from "@/features/tasks/types";

export interface BrainDumpEntry {
  id: string;
  raw_text: string;
  created_at: string;
}

export interface DayOverloadWarning {
  type: "day_overload";
  scheduled_date: string;
  total_minutes: number;
}

// One entry per task involved in a time conflict (not per pair) — a task
// overlapping 3+ others still produces a single warning, with every task
// it overlaps listed in conflicts_with.
export interface TimeConflictWarning {
  type: "time_conflict";
  scheduled_date: string;
  task_id: string;
  conflicts_with: { id: string; title: string }[];
}

export type Warning = DayOverloadWarning | TimeConflictWarning;

// Shape of create_brain_dump_with_tasks' return value (and therefore of
// POST /api/brain-dump's response body). Warnings are computed once at
// creation time and never recalculated (UX Specification §6.5) — they
// only ever exist attached to the batch that produced them, never
// re-derived from a later read of the tasks table.
export interface BrainDumpResponse {
  brainDumpEntry: BrainDumpEntry;
  tasks: Task[];
  warnings: Warning[];
}
