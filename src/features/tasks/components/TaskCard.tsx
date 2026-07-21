"use client";

import { useState, type FocusEvent } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, Check, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useConfirmTask } from "@/features/tasks/hooks/useConfirmTask";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import type { Task } from "@/features/tasks/types";
import { formatDateGroupLabel } from "@/features/brain-dump/lib/format-date";
import { PriorityPicker } from "./PriorityPicker";
import { DateFieldPicker } from "./DateFieldPicker";
import { TimeFieldPicker } from "./TimeFieldPicker";

interface TaskCardProps {
  task: Task;
  conflictWithTitle?: string;
  onConfirmed: (taskId: string) => void;
  onDeleted: (taskId: string) => void;
  // Local-only patch — see useDraftReview.updateTask. Used both to apply
  // the server's response after a blur-commit edit, and to optimistically
  // apply/revert the discrete priority/date/time pickers.
  onUpdated: (taskId: string, patch: Partial<Task>) => void;
}

// Draft Review card. Two structurally different Confirm affordances,
// matched to the mockups: a narrow side strip on mobile (card is a row:
// body + strip) and a full-width bar under the body on desktop (card is a
// column: body, then bar) — both rendered, toggled by breakpoint, rather
// than one element trying to flip its own layout role.
//
// Every field is editable in place (per explicit product decision — this
// screen doubles as the only place to fix up AI-suggested tasks before
// they're confirmed):
// - title/description/duration_minutes: blur-commit (local draft state,
//   PATCH on blur only if changed) — avoids a request per keystroke.
// - priority/scheduled_date/scheduled_time: Dropdown-based pickers,
//   committed optimistically on selection with a manual revert on
//   failure, since picking a value is already a deliberate action.
//
// `layoutId` is what makes a scheduled_date edit visibly fly the card
// from its old date group to its new one: groupBatch() re-buckets by
// scheduled_date on every render, so the card unmounts from one grid and
// remounts in another with the same id — framer-motion picks that up as
// a single shared-layout transition instead of an instant jump.
export function TaskCard({
  task,
  conflictWithTitle,
  onConfirmed,
  onDeleted,
  onUpdated,
}: TaskCardProps) {
  const confirmMutation = useConfirmTask();
  const deleteMutation = useDeleteTask();
  const updateMutation = useUpdateTask();

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(
    task.description ?? "",
  );
  const [durationDraft, setDurationDraft] = useState(
    String(task.duration_minutes),
  );

  const isBusy = confirmMutation.isPending || deleteMutation.isPending;

  function handleConfirm() {
    confirmMutation.mutate(task.id, { onSuccess: () => onConfirmed(task.id) });
  }

  function handleDelete() {
    deleteMutation.mutate(task.id, { onSuccess: () => onDeleted(task.id) });
  }

  function handleTitleBlur(event: FocusEvent<HTMLInputElement>) {
    const trimmed = event.target.value.trim();

    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title);
      return;
    }

    updateMutation.mutate(
      { taskId: task.id, patch: { title: trimmed } },
      {
        onSuccess: (updated) => onUpdated(task.id, updated),
        onError: () => setTitleDraft(task.title),
      },
    );
  }

  function handleDescriptionBlur(event: FocusEvent<HTMLTextAreaElement>) {
    const trimmed = event.target.value.trim();

    if (trimmed === (task.description ?? "")) {
      return;
    }

    updateMutation.mutate(
      { taskId: task.id, patch: { description: trimmed || null } },
      {
        onSuccess: (updated) => onUpdated(task.id, updated),
        onError: () => setDescriptionDraft(task.description ?? ""),
      },
    );
  }

  function handleDurationBlur(event: FocusEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(event.target.value, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDurationDraft(String(task.duration_minutes));
      return;
    }

    if (parsed === task.duration_minutes) {
      setDurationDraft(String(parsed));
      return;
    }

    updateMutation.mutate(
      { taskId: task.id, patch: { duration_minutes: parsed } },
      {
        onSuccess: (updated) => onUpdated(task.id, updated),
        onError: () => setDurationDraft(String(task.duration_minutes)),
      },
    );
  }

  function handlePriorityChange(nextPriority: Task["priority"]) {
    if (nextPriority === task.priority) return;

    const previousPriority = task.priority;
    const previousIsSuggestion = task.priority_is_suggestion;

    onUpdated(task.id, {
      priority: nextPriority,
      priority_is_suggestion: false,
    });

    updateMutation.mutate(
      { taskId: task.id, patch: { priority: nextPriority } },
      {
        onError: () =>
          onUpdated(task.id, {
            priority: previousPriority,
            priority_is_suggestion: previousIsSuggestion,
          }),
      },
    );
  }

  function handleDateChange(nextDate: string) {
    if (nextDate === task.scheduled_date) return;

    const previousDate = task.scheduled_date;

    onUpdated(task.id, { scheduled_date: nextDate });

    updateMutation.mutate(
      { taskId: task.id, patch: { scheduled_date: nextDate } },
      { onError: () => onUpdated(task.id, { scheduled_date: previousDate }) },
    );
  }

  function handleTimeChange(nextTime: string | null) {
    if (nextTime === task.scheduled_time) return;

    const previousTime = task.scheduled_time;

    onUpdated(task.id, { scheduled_time: nextTime });

    updateMutation.mutate(
      { taskId: task.id, patch: { scheduled_time: nextTime } },
      { onError: () => onUpdated(task.id, { scheduled_time: previousTime }) },
    );
  }

  return (
    <motion.article
      layout
      layoutId={task.id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.6 }}
      className="border-surface-card-border bg-surface-card rounded-card border flex flex-row lg:flex-col"
    >
      <div className="flex flex-row lg:flex-col flex-auto">
        <div className="relative flex-1 p-4 pr-11">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy}
            aria-label="Видалити задачу"
            title="Видалити"
            className="text-surface-text-muted hover:text-destructive absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>

          <input
            type="text"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={handleTitleBlur}
            disabled={isBusy}
            className="font-body text-surface-text w-full bg-transparent pr-1 text-[15px] leading-snug font-semibold outline-none disabled:opacity-60"
          />

          {task.description !== null && (
            <textarea
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={handleDescriptionBlur}
              disabled={isBusy}
              rows={1}
              className="font-body text-surface-text-muted mt-1 w-full resize-none bg-transparent text-[13px] leading-snug outline-none disabled:opacity-60"
            />
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <PriorityPicker
              value={task.priority}
              onChange={handlePriorityChange}
              disabled={isBusy}
            />

            {(task.priority_is_suggestion || task.duration_is_suggestion) && (
              <Badge variant="ai-suggestion">AI</Badge>
            )}
          </div>

          <div className="text-surface-text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <DateFieldPicker
              value={task.scheduled_date}
              onChange={handleDateChange}
              disabled={isBusy}
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  disabled={isBusy}
                  className="hover:text-surface-text inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <Calendar size={13} />
                  {formatDateGroupLabel(task.scheduled_date)}
                </button>
              )}
            />

            <TimeFieldPicker
              value={task.scheduled_time}
              onChange={handleTimeChange}
              disabled={isBusy}
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  disabled={isBusy}
                  className="hover:text-surface-text inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <Clock size={13} />
                  {task.scheduled_time
                    ? task.scheduled_time.slice(0, 5)
                    : "Час"}
                </button>
              )}
            />

            <span className="inline-flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={durationDraft}
                onChange={(event) => setDurationDraft(event.target.value)}
                onBlur={handleDurationBlur}
                disabled={isBusy}
                className="w-8 border-b border-transparent bg-transparent text-right outline-none focus:border-current disabled:opacity-60"
              />
              <span>хв</span>
            </span>
          </div>

          {conflictWithTitle && (
            <p className="text-destructive mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium">
              <AlertTriangle size={13} />
              Конфлікт з «{conflictWithTitle}»
            </p>
          )}
        </div>

        {/* Confirm — a coral-tinted strip that's part of the card itself,
            not a boxed Button in a separate footer (per design review). */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isBusy}
          aria-label="Підтвердити задачу"
          title="Підтвердити"
          className="bg-brand-accent/15 border-brand-accent/20 text-surface-toast-undo rounded-r-card hover:bg-brand-accent/30 hover:text-brand-accent-light flex w-[52px] shrink-0 items-center justify-center border-l transition-colors duration-150 disabled:opacity-40 lg:hidden"
        >
          {confirmMutation.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Check size={19} strokeWidth={3} />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isBusy}
        className="bg-brand-accent/15 border-brand-accent/20 text-surface-toast-undo font-accent rounded-b-card hover:bg-brand-accent/30 hover:text-brand-accent-light hidden w-full items-center justify-center gap-2 border-t p-3 text-[13px] font-bold transition-colors duration-150 disabled:opacity-40 lg:flex"
      >
        {confirmMutation.isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <>
            <Check size={15} strokeWidth={3} />
            Підтвердити
          </>
        )}
      </button>
    </motion.article>
  );
}
