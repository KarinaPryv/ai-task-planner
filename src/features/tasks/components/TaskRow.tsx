"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { Check, ChevronRight, GripVertical } from "lucide-react";
import { formatTaskMeta } from "@/features/brain-dump/lib/format-date";
import type { Task } from "@/features/tasks/types";

interface TaskRowProps {
  task: Task;
  isLast: boolean;
  onToggle: () => void;
  onClick: () => void;
  // Present only for draggable (confirmed) rows — starts the
  // framer-motion Reorder drag from the handle instead of the whole row
  // (TodayPlanList wires this to a Reorder.Item's dragControls).
  onDragHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

// Today's Plan compact row (PRD §12, UX Specification §6.1, mockup "Today's
// Plan — фінальна структура рядка"). Two independent tap zones: the
// checkbox (instant done/reopen, PRD §5) and the rest of the row (opens
// Task Detail — currently a stub via onClick, real modal is a later
// increment). The drag handle is a third, separate zone that never
// triggers either.
export function TaskRow({ task, isLast, onToggle, onClick, onDragHandlePointerDown }: TaskRowProps) {
  const isDone = task.status === "done";

  return (
    <div
      className={`flex items-center gap-2 py-2.5 ${!isLast ? "border-surface-card-border border-b" : ""}`}
    >
      {onDragHandlePointerDown && (
        <button
          type="button"
          onPointerDown={onDragHandlePointerDown}
          aria-label="Перетягнути для зміни порядку"
          className="text-surface-text-muted flex h-4 w-4 shrink-0 touch-none items-center justify-center opacity-30 active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
      )}

      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? "Повернути задачу в активні" : "Позначити задачу виконаною"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={`rounded-checkbox flex h-[19px] w-[19px] shrink-0 items-center justify-center border-2 ${
          isDone ? "bg-brand-accent border-brand-accent" : "border-surface-checkbox-border"
        }`}
      >
        {isDone && <Check size={11} strokeWidth={3} className="text-white" />}
      </button>

      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {!isDone && (
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ backgroundColor: `var(--badge-${task.priority}-fg)` }}
          />
        )}

        <span className="min-w-0 flex-1">
          <span
            className={`font-body text-surface-text line-clamp-2 block text-[13.5px] leading-snug font-semibold ${
              isDone ? "opacity-45 line-through" : ""
            }`}
          >
            {task.title}
          </span>

          {task.description !== null && (
            <span
              className={`font-body text-surface-text-muted mt-0.5 block truncate text-[11px] ${
                isDone ? "opacity-60" : ""
              }`}
            >
              {task.description}
            </span>
          )}
        </span>

        <span className="text-surface-text-muted shrink-0 text-[11.5px] font-semibold">
          {formatTaskMeta(task)}
        </span>

        <ChevronRight size={9} className="text-surface-text-muted shrink-0 opacity-35" />
      </button>
    </div>
  );
}
