"use client";

import { useEffect, useState, type FocusEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Calendar, Check, Clock, Timer, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import type { Task } from "@/features/tasks/types";
import { formatDateGroupLabel, formatDuration } from "@/features/brain-dump/lib/format-date";
import { PriorityPicker, PRIORITY_LABELS } from "./PriorityPicker";
import { DateFieldPicker } from "./DateFieldPicker";
import { TimeFieldPicker } from "./TimeFieldPicker";
import { DurationPicker } from "./DurationPicker";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onToggle: () => void;
  onUpdated: (patch: Partial<Task>) => void;
  onDelete: () => void;
}

// UX Specification §2.4/§1.5, mockup "Task Detail — модалка". Mobile:
// full-screen replacement of the current view (no backdrop — matches the
// mockup, which never draws a dimmed layer behind the mobile frame's own
// content). Desktop: centered card over a backdrop-scrim, same
// bg-surface-modal/border-surface-modal-border/shadow-glow tokens Dropdown
// already uses (UI Specification "Modal"). One JSX tree for the fields —
// only the outer chrome differs by breakpoint, via lg: overrides.
export function TaskDetailModal({ task, onClose, onToggle, onUpdated, onDelete }: TaskDetailModalProps) {
  const updateMutation = useUpdateTask();

  const isDone = task.status === "done";

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? "");

  // Keep local drafts in sync if the underlying task changes out from
  // under us (e.g. a picker commit in this same modal re-renders with a
  // fresh task prop from the parent's tasks[]).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs local draft state when the task prop changes from the parent
    setTitleDraft(task.title);
    setDescriptionDraft(task.description ?? "");
  }, [task.id, task.title, task.description]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // A picker dropdown (PriorityPicker/DateFieldPicker/TimeFieldPicker/
      // DurationPicker, all built on Dropdown) is open and has its own
      // Escape handler — let it close first instead of also closing this
      // modal on the same keypress.
      if (document.querySelector('[role="listbox"]')) return;
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleTitleBlur(event: FocusEvent<HTMLInputElement>) {
    const trimmed = event.target.value.trim();

    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title);
      return;
    }

    onUpdated({ title: trimmed });
    updateMutation.mutate(
      { taskId: task.id, patch: { title: trimmed } },
      {
        onError: () => {
          onUpdated({ title: task.title });
          setTitleDraft(task.title);
        },
      },
    );
  }

  function handleDescriptionBlur(event: FocusEvent<HTMLTextAreaElement>) {
    const trimmed = event.target.value.trim();

    if (trimmed === (task.description ?? "")) return;

    const nextValue = trimmed || null;

    onUpdated({ description: nextValue });
    updateMutation.mutate(
      { taskId: task.id, patch: { description: nextValue } },
      {
        onError: () => {
          onUpdated({ description: task.description });
          setDescriptionDraft(task.description ?? "");
        },
      },
    );
  }

  function handlePriorityChange(nextPriority: Task["priority"]) {
    if (nextPriority === task.priority) return;

    const previousPriority = task.priority;
    const previousIsSuggestion = task.priority_is_suggestion;

    onUpdated({ priority: nextPriority, priority_is_suggestion: false });
    updateMutation.mutate(
      { taskId: task.id, patch: { priority: nextPriority } },
      {
        onError: () =>
          onUpdated({ priority: previousPriority, priority_is_suggestion: previousIsSuggestion }),
      },
    );
  }

  function handleDateChange(nextDate: string) {
    if (nextDate === task.scheduled_date) return;

    const previousDate = task.scheduled_date;

    onUpdated({ scheduled_date: nextDate });
    updateMutation.mutate(
      { taskId: task.id, patch: { scheduled_date: nextDate } },
      { onError: () => onUpdated({ scheduled_date: previousDate }) },
    );
  }

  function handleTimeChange(nextTime: string | null) {
    if (nextTime === task.scheduled_time) return;

    const previousTime = task.scheduled_time;

    onUpdated({ scheduled_time: nextTime });
    updateMutation.mutate(
      { taskId: task.id, patch: { scheduled_time: nextTime } },
      { onError: () => onUpdated({ scheduled_time: previousTime }) },
    );
  }

  function handleDurationChange(nextDuration: number) {
    if (nextDuration === task.duration_minutes) return;

    const previousDuration = task.duration_minutes;
    const previousIsSuggestion = task.duration_is_suggestion;

    onUpdated({ duration_minutes: nextDuration, duration_is_suggestion: false });
    updateMutation.mutate(
      { taskId: task.id, patch: { duration_minutes: nextDuration } },
      {
        onError: () =>
          onUpdated({ duration_minutes: previousDuration, duration_is_suggestion: previousIsSuggestion }),
      },
    );
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Деталі задачі"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-surface-modal lg:items-center lg:justify-center lg:bg-black/40"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
        style={{ backdropFilter: "blur(28px)" }}
        className="flex flex-1 flex-col overflow-y-auto lg:max-h-[85vh] lg:w-[420px] lg:flex-none lg:rounded-modal lg:border lg:border-surface-modal-border lg:bg-surface-modal lg:shadow-glow"
      >
        {/* Mobile topbar: X, spacer, trash */}
        <div className="flex shrink-0 items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="text-surface-text-muted flex h-8 w-8 items-center justify-center rounded-full opacity-60 hover:opacity-100"
          >
            <X size={18} />
          </button>
          {!isDone && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Видалити задачу"
              title="Видалити"
              className="text-surface-text-muted hover:text-destructive flex h-8 w-8 items-center justify-center rounded-full opacity-60 hover:opacity-100"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Desktop topbar: label, spacer, trash, X */}
        <div className="hidden shrink-0 items-center justify-between px-5 pt-4 pb-2 lg:flex">
          <span className="font-body text-surface-text-muted text-[13px] font-bold opacity-60">
            Деталі задачі
          </span>
          <div className="flex items-center gap-1">
            {!isDone && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Видалити задачу"
                title="Видалити"
                className="text-surface-text-muted hover:text-destructive flex h-8 w-8 items-center justify-center rounded-full opacity-60 hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="text-surface-text-muted flex h-8 w-8 items-center justify-center rounded-full opacity-60 hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mb-5 flex items-start gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={isDone}
              aria-label={isDone ? "Повернути задачу в активні" : "Позначити задачу виконаною"}
              onClick={onToggle}
              className={`rounded-checkbox mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 ${
                isDone ? "bg-brand-accent border-brand-accent" : "border-surface-checkbox-border"
              }`}
            >
              {isDone && <Check size={13} strokeWidth={3} className="text-white" />}
            </button>

            {isDone ? (
              <p className="font-body text-surface-text pt-0.5 text-[17px] leading-snug font-bold opacity-60 line-through">
                {task.title}
              </p>
            ) : (
              <input
                type="text"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={handleTitleBlur}
                className="font-body text-surface-text w-full bg-transparent pt-0.5 text-[17px] leading-snug font-bold outline-none"
              />
            )}
          </div>

          <div className="mb-5">
            <p className="font-body text-surface-text-muted mb-1.5 text-[11px] font-bold tracking-wide uppercase opacity-50">
              Опис
            </p>
            {isDone ? (
              <p className="font-body text-surface-text-muted text-[13.5px] leading-relaxed opacity-60">
                {task.description || "—"}
              </p>
            ) : (
              <textarea
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                onBlur={handleDescriptionBlur}
                rows={2}
                placeholder="Без опису"
                className="font-body text-surface-text border-surface-card-border bg-surface-card w-full resize-none rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed outline-none placeholder:opacity-50"
              />
            )}
          </div>

          <div className="mb-5">
            <p className="font-body text-surface-text-muted mb-1.5 text-[11px] font-bold tracking-wide uppercase opacity-50">
              Пріоритет
            </p>
            {isDone ? (
              <Badge variant={task.priority}>{PRIORITY_LABELS[task.priority]}</Badge>
            ) : (
              <PriorityPicker value={task.priority} onChange={handlePriorityChange} />
            )}
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <p className="font-body text-surface-text-muted mb-1.5 text-[11px] font-bold tracking-wide uppercase opacity-50">
                Дата
              </p>
              {isDone ? (
                <ValueChip icon={<Calendar size={14} />}>{formatDateGroupLabel(task.scheduled_date)}</ValueChip>
              ) : (
                <DateFieldPicker
                  value={task.scheduled_date}
                  onChange={handleDateChange}
                  trigger={({ toggle }) => (
                    <button type="button" onClick={toggle}>
                      <ValueChip icon={<Calendar size={14} />}>
                        {formatDateGroupLabel(task.scheduled_date)}
                      </ValueChip>
                    </button>
                  )}
                />
              )}
            </div>

            <div className="flex-1">
              <p className="font-body text-surface-text-muted mb-1.5 text-[11px] font-bold tracking-wide uppercase opacity-50">
                Час
              </p>
              {isDone ? (
                <ValueChip icon={<Clock size={14} />}>
                  {task.scheduled_time ? task.scheduled_time.slice(0, 5) : "Без часу"}
                </ValueChip>
              ) : (
                <TimeFieldPicker
                  value={task.scheduled_time}
                  onChange={handleTimeChange}
                  trigger={({ toggle }) => (
                    <button type="button" onClick={toggle}>
                      <ValueChip icon={<Clock size={14} />}>
                        {task.scheduled_time ? task.scheduled_time.slice(0, 5) : "Без часу"}
                      </ValueChip>
                    </button>
                  )}
                />
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="font-body text-surface-text-muted mb-1.5 text-[11px] font-bold tracking-wide uppercase opacity-50">
              Тривалість
            </p>
            {isDone ? (
              <ValueChip icon={<Timer size={14} />}>{formatDuration(task.duration_minutes)}</ValueChip>
            ) : (
              <DurationPicker
                value={task.duration_minutes}
                onChange={handleDurationChange}
                trigger={({ toggle }) => (
                  <button type="button" onClick={toggle}>
                    <ValueChip icon={<Timer size={14} />}>{formatDuration(task.duration_minutes)}</ValueChip>
                  </button>
                )}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ValueChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="border-surface-card-border bg-surface-card text-surface-text inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold">
      {icon}
      {children}
    </span>
  );
}
