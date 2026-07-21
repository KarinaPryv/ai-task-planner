"use client";

import type { ReactNode } from "react";
import type { Task } from "@/features/tasks/types";
import { UpcomingTaskRow } from "./UpcomingTaskRow";

interface DayColumnProps {
  header: ReactNode;
  activeTasks: Task[];
  doneTasks: Task[];
  overdue?: boolean;
  emptyMessage: string;
  onTaskClick: (task: Task) => void;
}

// UX Specification §10.1/10.4/10.7 — one board column (a regular day or
// the "Прострочено" column). Full-width on mobile (one column per
// screen, snap-scroll between them — no next-column peek, per explicit
// product decision), narrower on desktop so several are visible
// side-by-side while the same horizontal snap-scroll board still handles
// the rest, rather than switching to a non-scrolling grid.
//
// Active and done tasks render as two groups with a divider between them
// (product decision — done tasks are visible here too, dimmed, rather
// than hidden). The divider only appears when both groups are non-empty;
// overdue columns never receive doneTasks (a done task isn't "overdue").
export function DayColumn({
  header,
  activeTasks,
  doneTasks,
  overdue = false,
  emptyMessage,
  onTaskClick,
}: DayColumnProps) {
  const isEmpty = activeTasks.length === 0 && doneTasks.length === 0;

  return (
    <div className="border-surface-card-border flex w-full shrink-0 snap-start flex-col border-r last:border-r-0 lg:w-[240px]">
      {header}

      <div className="flex-1 overflow-y-auto px-4">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <span className="font-body text-surface-text text-[12px] opacity-50">{emptyMessage}</span>
          </div>
        ) : (
          <>
            {activeTasks.map((task, index) => (
              <UpcomingTaskRow
                key={task.id}
                task={task}
                // The last active row never gets its own bottom border —
                // either it's the true end of the list, or SectionDivider
                // right after it already draws the separating line, and a
                // second one directly above it would read as two dividers.
                isLast={index === activeTasks.length - 1}
                overdue={overdue}
                onClick={() => onTaskClick(task)}
              />
            ))}

            {activeTasks.length > 0 && doneTasks.length > 0 && <SectionDivider />}

            {doneTasks.map((task, index) => (
              <UpcomingTaskRow
                key={task.id}
                task={task}
                isLast={index === doneTasks.length - 1}
                done
                onClick={() => onTaskClick(task)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Same divider treatment as Today's Plan's active/done split, reused
// here verbatim per explicit product decision.
function SectionDivider() {
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="bg-surface-divider h-px flex-1" />
      <span className="text-surface-text-muted font-body text-[9.5px] font-bold tracking-wide uppercase opacity-70">
        Виконано
      </span>
      <div className="bg-surface-divider h-px flex-1" />
    </div>
  );
}
