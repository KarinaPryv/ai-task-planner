"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Toast } from "@/components/ui/Toast";
import { useCompleteTask } from "@/features/tasks/hooks/useCompleteTask";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";
import { useReopenTask } from "@/features/tasks/hooks/useReopenTask";
import { useRestoreTask } from "@/features/tasks/hooks/useRestoreTask";
import { TaskDetailModal } from "@/features/tasks/components/TaskDetailModal";
import type { Task } from "@/features/tasks/types";
import { addDaysIso, formatWeekRangeLabel, mondayOfIso, parseLocalDate, weekIndexForDate } from "@/lib/date";
import { useUpcomingWeek } from "../hooks/useUpcomingWeek";
import { DayColumn } from "./DayColumn";
import { WeekDatePicker } from "./WeekDatePicker";

interface UpcomingBoardProps {
  today: string;
  initialWeekStart: string;
  initialTasks: Task[];
}

const DOW_FULL = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

function isoDayIndex(iso: string): number {
  return (parseLocalDate(iso).getDay() + 6) % 7; // Mon=0 ... Sun=6
}

// Re-inserts a task at its sort_order position among same-day siblings,
// instead of at the end — used when a task comes back into view (Undo,
// or rolling back a failed mutation) so it lands back where it was, not
// wherever happens to be last in that day's list.
function insertBySortOrder(list: Task[], task: Task): Task[] {
  const next = [...list];
  const insertIndex = next.findIndex(
    (t) => t.scheduled_date === task.scheduled_date && t.sort_order > task.sort_order,
  );

  if (insertIndex === -1) next.push(task);
  else next.splice(insertIndex, 0, task);

  return next;
}

// Column indices currently visible (>50% on-screen) in a horizontally
// scrolling row — drives the dot pagination so desktop (several columns
// at once) highlights all of them, not just one, while mobile (exactly
// one column fits) naturally reduces to a single active dot.
function computeVisibleIndices(container: HTMLDivElement): number[] {
  const viewStart = container.scrollLeft;
  const viewEnd = viewStart + container.clientWidth;
  const visible: number[] = [];

  Array.from(container.children).forEach((child, index) => {
    const el = child as HTMLElement;
    const elStart = el.offsetLeft;
    const elEnd = elStart + el.offsetWidth;
    const overlap = Math.max(0, Math.min(elEnd, viewEnd) - Math.max(elStart, viewStart));

    if (overlap > el.offsetWidth / 2) visible.push(index);
  });

  return visible.length > 0 ? visible : [0];
}

// UX Specification §10 — the Upcoming board: week navigation (arrows +
// date picker), snap-scroll columns with dot pagination, and the same
// Task Detail / optimistic-delete-with-Undo pattern already established
// on Today's Plan (§9.5/8.4), reused as-is.
export function UpcomingBoard({ today, initialWeekStart, initialTasks }: UpcomingBoardProps) {
  const { weekIndex, weekStart, weekEnd, rangeStart, tasks, setTasks, isLoading, goToWeekIndex } =
    useUpcomingWeek({ today, initialWeekStart, initialTasks });

  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  // Single-item Undo, same rule as Today's Plan: a second delete before
  // the first's toast expires simply drops the first one's Undo option.
  const [pendingUndo, setPendingUndo] = useState<Task | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndices, setActiveIndices] = useState<number[]>([0]);

  // §10.3: on a Monday the current week is already un-trimmed, so the
  // Overdue column is withheld even if older overdue tasks exist. A done
  // task is never "overdue" — it's just finished late — so this stays
  // confirmed-only even though `tasks` now also contains done ones.
  const isMonday = isoDayIndex(today) === 0;
  const overdueTasks = tasks.filter((task) => task.status === "confirmed" && task.scheduled_date < today);
  const showOverdue = weekIndex === 0 && !isMonday && overdueTasks.length > 0;

  const days: string[] = [];
  for (let d = rangeStart; d <= weekEnd; d = addDaysIso(d, 1)) {
    days.push(d);
  }

  const activeByDate = new Map<string, Task[]>();
  const doneByDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.scheduled_date < rangeStart) continue; // overdue-eligible, handled above
    const map = task.status === "done" ? doneByDate : activeByDate;
    const bucket = map.get(task.scheduled_date);
    if (bucket) bucket.push(task);
    else map.set(task.scheduled_date, [task]);
  }

  const totalColumns = (showOverdue ? 1 : 0) + days.length;
  const currentWeekMonday = mondayOfIso(today);

  // Reset scroll to the "today" column (or the first column for other
  // weeks) whenever the displayed week actually changes — deliberately
  // not tied to `tasks`, so an in-place edit within the current week
  // never yanks the scroll position back. Wrapped in requestAnimationFrame
  // because right after a week switch (including the very first mount)
  // column widths/offsets aren't reliably settled yet in the same paint —
  // without it, scrollTo can silently land on the wrong column and
  // scroll-snap then locks it there.
  useEffect(() => {
    const targetIndex = showOverdue ? 1 : 0;

    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const targetEl = container?.children[targetIndex] as HTMLElement | undefined;

      if (container && targetEl) {
        container.scrollTo({ left: targetEl.offsetLeft, behavior: "auto" });
      }

      setActiveIndices([targetIndex]);
    });

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only on week navigation (see comment above), not on every task edit
  }, [weekIndex]);

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;

    setActiveIndices(computeVisibleIndices(container));
  }

  function handlePrevWeek() {
    if (weekIndex === 0 || isLoading) return;
    goToWeekIndex(weekIndex - 1);
  }

  function handleNextWeek() {
    if (isLoading) return;
    goToWeekIndex(weekIndex + 1);
  }

  function handleDateSelect(iso: string) {
    if (isLoading) return;
    goToWeekIndex(weekIndexForDate(iso, currentWeekMonday));
  }

  function handleTaskClick(task: Task) {
    setSelectedTaskId(task.id);
  }

  // Toggling here just moves the task between its day's active/done
  // groups (no local removal, no closing the modal) — done tasks stay
  // visible per the product decision above, so the user can flip a task
  // back and forth within the same open Task Detail session (§9.4).
  function handleToggle() {
    if (!selectedTask) return;
    const task = selectedTask;
    const nextStatus = task.status === "done" ? "confirmed" : "done";

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));

    const mutation = nextStatus === "done" ? completeTask : reopenTask;
    mutation.mutate(task.id, {
      onError: () => setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))),
    });
  }

  function handleUpdated(patch: Partial<Task>) {
    if (!selectedTaskId) return;
    setTasks((prev) => prev.map((t) => (t.id === selectedTaskId ? { ...t, ...patch } : t)));
  }

  // Optimistic + fires immediately, same "already correct even if the tab
  // closes" invariant as Today's Plan (§8.2/9.5).
  function handleDelete() {
    if (!selectedTask) return;
    const task = selectedTask;

    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSelectedTaskId(null);
    setPendingUndo(task);

    deleteTask.mutate(task.id, {
      onError: () => {
        setTasks((prev) => insertBySortOrder(prev, task));
        setPendingUndo((current) => (current?.id === task.id ? null : current));
      },
    });
  }

  function handleUndo() {
    if (!pendingUndo) return;
    const task = pendingUndo;

    setPendingUndo(null);
    setTasks((prev) => insertBySortOrder(prev, task));

    restoreTask.mutate(task.id, {
      onSuccess: (restored) => setTasks((prev) => prev.map((t) => (t.id === restored.id ? restored : t))),
      onError: () => setTasks((prev) => prev.filter((t) => t.id !== task.id)),
    });
  }

  function handleToastDismiss() {
    setPendingUndo(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center gap-2 px-4 pt-1.5 pb-3.5">
        <button
          type="button"
          onClick={handlePrevWeek}
          disabled={weekIndex === 0 || isLoading}
          aria-label="Попередній тиждень"
          className="text-surface-text-muted hover:bg-surface-secondary-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>

        <WeekDatePicker
          today={today}
          disabled={isLoading}
          onSelect={handleDateSelect}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="border-surface-secondary-btn-border bg-surface-secondary-btn text-surface-text font-body flex w-[264px] items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[13.5px] font-semibold"
            >
              <CalendarIcon size={15} />
              {formatWeekRangeLabel(weekStart, weekEnd)}
              {weekIndex === 0 && (
                <span className="bg-brand-accent/[0.16] text-brand-accent ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  Сьогодні
                </span>
              )}
            </button>
          )}
        />

        <button
          type="button"
          onClick={handleNextWeek}
          disabled={isLoading}
          aria-label="Наступний тиждень"
          className="text-surface-text hover:bg-surface-secondary-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="border-surface-card-border bg-surface-card relative mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border lg:mx-10">
        {isLoading && (
          <div className="bg-surface-card/70 absolute inset-0 z-10 flex items-center justify-center">
            <span className="border-brand-accent h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex min-h-0 min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        >
          {showOverdue && (
            <DayColumn
              overdue
              header={
                <div className="flex shrink-0 items-center justify-center gap-1.5 py-4">
                  <AlertTriangle size={13} className="text-badge-high-fg" />
                  <span className="font-body text-badge-high-fg text-[13px] font-bold">Прострочено</span>
                </div>
              }
              activeTasks={overdueTasks}
              doneTasks={[]}
              emptyMessage="Немає прострочених задач"
              onTaskClick={handleTaskClick}
            />
          )}

          {days.map((iso) => {
            const isToday = iso === today;

            return (
              <DayColumn
                key={iso}
                header={
                  <div
                    className={[
                      "flex shrink-0 items-center justify-center gap-1.5 py-4 text-center",
                      isToday ? "text-brand-accent" : "text-surface-text",
                    ].join(" ")}
                  >
                    <span className="font-body text-[12px] font-bold opacity-70">
                      {DOW_FULL[isoDayIndex(iso)]}
                    </span>
                    <span className="font-body text-[14px] font-bold">{parseLocalDate(iso).getDate()}</span>
                  </div>
                }
                activeTasks={activeByDate.get(iso) ?? []}
                doneTasks={doneByDate.get(iso) ?? []}
                emptyMessage="Нічого не заплановано"
                onTaskClick={handleTaskClick}
              />
            );
          })}
        </div>

        <div className="flex shrink-0 justify-center gap-1.5 py-2.5">
          {Array.from({ length: totalColumns }).map((_, index) => (
            <span
              key={index}
              className={[
                "h-1.5 w-1.5 rounded-full transition-transform",
                activeIndices.includes(index) ? "bg-brand-accent scale-150" : "bg-surface-text/20",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            key={selectedTask.id}
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onToggle={handleToggle}
            onUpdated={handleUpdated}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingUndo && (
          <Toast
            key="upcoming-delete-undo"
            message="Задачу видалено"
            actionLabel="Скасувати"
            onAction={handleUndo}
            onDismiss={handleToastDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
