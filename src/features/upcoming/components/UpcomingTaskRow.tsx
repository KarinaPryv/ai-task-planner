"use client";

import { Badge } from "@/components/ui/Badge";
import { PRIORITY_LABELS } from "@/features/tasks/components/PriorityPicker";
import { formatDateGroupLabel, formatDuration } from "@/features/brain-dump/lib/format-date";
import type { Task } from "@/features/tasks/types";

interface UpcomingTaskRowProps {
  task: Task;
  isLast: boolean;
  overdue?: boolean;
  done?: boolean;
  onClick: () => void;
}

// UX Specification §10.5/10.6 — read-only row (no checkbox, no drag
// handle, unlike Today's Plan's TaskRow): title → time (if set) →
// duration → priority badge, no description/AI-suggestion mark. Overdue
// rows additionally show the original scheduled_date instead of a time,
// and a passive semantic-High accent (§10.6: "за аналогією з
// warning-стилем Draft Card") — reusing the priority-High token, not the
// unrelated generic destructive color. `done` (product decision — done
// tasks are visible here too, dimmed + struck through, grouped below the
// active ones by DayColumn) never combines with `overdue`: the overdue
// query is confirmed-only.
export function UpcomingTaskRow({ task, isLast, overdue = false, done = false, onClick }: UpcomingTaskRowProps) {
  const metaBits: string[] = [];

  if (overdue) {
    metaBits.push(`з ${formatDateGroupLabel(task.scheduled_date)}`);
  } else if (task.scheduled_time) {
    metaBits.push(task.scheduled_time.slice(0, 5));
  }

  metaBits.push(formatDuration(task.duration_minutes));

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center justify-between gap-2 py-3 text-left",
        !isLast ? "border-surface-card-border border-b" : "",
        overdue ? "border-badge-high-fg border-l-2 pl-2" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={["min-w-0 flex-1", done ? "opacity-45" : ""].join(" ")}>
        <span
          className={[
            "font-body block truncate text-[13px] font-bold",
            overdue ? "text-badge-high-fg" : "text-surface-text",
            done ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {task.title}
        </span>
        <span className="font-body text-surface-text-muted mt-0.5 block text-[11px] opacity-60">
          {metaBits.join(" · ")}
        </span>
      </span>

      <Badge variant={task.priority} className={done ? "opacity-45" : undefined}>
        {PRIORITY_LABELS[task.priority]}
      </Badge>
    </button>
  );
}
