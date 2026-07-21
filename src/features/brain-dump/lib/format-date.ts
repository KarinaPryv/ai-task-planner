import type { Task } from "@/features/tasks/types";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Date group header label — "Сьогодні"/"Завтра"/"Вчора" relative to the
// viewer's local day, falling back to a short absolute date further out.
export function formatDateGroupLabel(scheduledDate: string): string {
  const today = startOfDay(new Date());
  const date = startOfDay(new Date(`${scheduledDate}T00:00:00`));
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Сьогодні";
  if (diffDays === 1) return "Завтра";
  if (diffDays === -1) return "Вчора";

  return date.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

// Batch divider label — relative day + time the Brain Dump was submitted.
export function formatBatchTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
  const time = date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  const dayLabel = formatDateGroupLabel(date.toISOString().slice(0, 10));

  return `${dayLabel} · ${time}`;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} хв`;
  if (minutes === 0) return `${hours} год`;
  return `${hours} год ${minutes} хв`;
}

export { formatDuration };

// Task meta chip — "14:30 · 45 хв" when a time is set, otherwise just the
// duration.
export function formatTaskMeta(task: Task): string {
  const durationLabel = formatDuration(task.duration_minutes);

  if (task.scheduled_time) {
    return `${task.scheduled_time.slice(0, 5)} · ${durationLabel}`;
  }

  return durationLabel;
}
