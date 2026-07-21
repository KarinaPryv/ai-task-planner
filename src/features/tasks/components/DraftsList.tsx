"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
import { usePageBadge } from "@/components/ui/PageBadgeContext";
import { useConfirmBatch } from "@/features/tasks/hooks/useConfirmBatch";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";
import { useRestoreTask } from "@/features/tasks/hooks/useRestoreTask";
import type { Task } from "@/features/tasks/types";
import { TaskCard } from "./TaskCard";

interface DraftsListProps {
  initialTasks: Task[];
}

// UX Specification §7 Drafts — flat list (no date/batch grouping, unlike
// Review), sorted by created_at desc (§7.2, done server-side in
// getDraftTasks). Draft Card is TaskCard as-is (§7.3) with the extra
// created_at label. Confirm All mirrors DateGroupHeader's existing
// non-optimistic pattern (wait for the round trip, no per-card undo
// needed — confirming was never meant to show a toast, §7.4). Delete All
// mirrors Today's Plan's optimistic Undo pattern (§7.5) since deletion
// needs to be undoable.
export function DraftsList({ initialTasks }: DraftsListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const confirmBatch = useConfirmBatch();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const { setCount } = usePageBadge();
  // One undo toast at a time, holding every task it can restore — a
  // single-card delete stores one task, Delete All stores the whole
  // batch that was visible when it was pressed (§7.5: "один спільний
  // Undo toast, який відновлює весь набір").
  const [pendingUndo, setPendingUndo] = useState<Task[] | null>(null);

  useEffect(() => {
    setCount("/drafts", tasks.length);
    return () => setCount("/drafts", null);
  }, [tasks.length, setCount]);

  function handleConfirmed(taskId: string) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  // TaskCard already ran its own DELETE mutation to completion before
  // calling this (see TaskCard.handleDelete) — only local list/undo
  // bookkeeping happens here.
  function handleDeleted(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setPendingUndo([task]);
  }

  function handleUpdated(taskId: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }

  function handleConfirmAll() {
    const ids = tasks.map((task) => task.id);

    confirmBatch.mutate(ids, {
      onSuccess: (confirmedIds) => {
        const confirmedSet = new Set(confirmedIds);
        setTasks((prev) => prev.filter((task) => !confirmedSet.has(task.id)));
      },
    });
  }

  // Optimistic, same "already correct even if the tab closes" invariant
  // as Today's Plan: each delete fires right away rather than waiting for
  // the toast to expire.
  function handleDeleteAll() {
    if (tasks.length === 0) return;

    const batch = tasks;
    setTasks([]);
    setPendingUndo(batch);

    Promise.all(batch.map((task) => deleteTask.mutateAsync(task.id))).catch(() => {
      setTasks((prev) => [...prev, ...batch]);
      setPendingUndo((current) => (current === batch ? null : current));
    });
  }

  function handleUndo() {
    if (!pendingUndo) return;

    const batch = pendingUndo;
    setPendingUndo(null);
    setTasks((prev) => [...prev, ...batch]);

    Promise.all(batch.map((task) => restoreTask.mutateAsync(task.id))).catch(() => {
      const idSet = new Set(batch.map((task) => task.id));
      setTasks((prev) => prev.filter((task) => !idSet.has(task.id)));
    });
  }

  function handleToastDismiss() {
    setPendingUndo(null);
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        message="Усі чернетки оброблені"
        cta={
          <Link href="/brain-dump">
            <Button variant="primary" size="md">
              Створити новий Brain Dump
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 lg:px-10 lg:pt-6">
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={confirmBatch.isPending}
            onClick={handleConfirmAll}
          >
            <Check size={13} strokeWidth={3} />
            Підтвердити всі
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDeleteAll}>
            <Trash2 size={13} />
            Видалити всі
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AnimatePresence>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showCreatedAt
                onConfirmed={handleConfirmed}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {pendingUndo && (
          <Toast
            key="drafts-delete-undo"
            message={pendingUndo.length === 1 ? "Задачу видалено" : "Усі чернетки видалено"}
            actionLabel="Скасувати"
            onAction={handleUndo}
            onDismiss={handleToastDismiss}
          />
        )}
      </AnimatePresence>
    </>
  );
}
