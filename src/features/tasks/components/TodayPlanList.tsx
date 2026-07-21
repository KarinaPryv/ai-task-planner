"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCompleteTask } from "@/features/tasks/hooks/useCompleteTask";
import { useReopenTask } from "@/features/tasks/hooks/useReopenTask";
import { useReorderTasks } from "@/features/tasks/hooks/useReorderTasks";
import type { Task } from "@/features/tasks/types";
import { TaskRow } from "./TaskRow";

interface TodayPlanListProps {
  initialTasks: Task[];
  todayDate: string;
  // Stub for now — a later increment wires this to a Task Detail modal
  // (UX Specification §6.1). Optional (defaults to a no-op) because the
  // Server Component page can't pass a function prop across the RSC
  // boundary.
  onTaskClick?: (task: Task) => void;
}

function byLowestSortOrderFirst(a: Task, b: Task): number {
  return a.sort_order - b.sort_order;
}

// UX Specification §6.2 — active (confirmed) and done zones are visually
// separate groups, and only the active zone is draggable. Reordering uses
// framer-motion's Reorder (already a project dependency) for touch-friendly
// drag&drop with no new package.
export function TodayPlanList({ initialTasks, todayDate, onTaskClick = () => {} }: TodayPlanListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const reorderTasks = useReorderTasks();

  const activeTasks = tasks.filter((task) => task.status === "confirmed").sort(byLowestSortOrderFirst);
  const doneTasks = tasks.filter((task) => task.status === "done").sort(byLowestSortOrderFirst);

  function handleToggle(task: Task) {
    const previousTasks = tasks;
    const nextStatus = task.status === "confirmed" ? "done" : "confirmed";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );

    const mutation = nextStatus === "done" ? completeTask : reopenTask;
    mutation.mutate(task.id, { onError: () => setTasks(previousTasks) });
  }

  // sort_order only needs to stay unique within this request (the RPC
  // checks uniqueness within the passed set, not globally) — reassigning
  // 0..n-1 to the reordered active tasks is simplest and never collides
  // with done tasks' preserved sort_order.
  function handleReorder(nextActiveOrder: Task[]) {
    const previousTasks = tasks;
    const reindexed = nextActiveOrder.map((task, index) => ({ ...task, sort_order: index }));
    const reindexedById = new Map(reindexed.map((task) => [task.id, task]));

    setTasks((prev) => prev.map((task) => reindexedById.get(task.id) ?? task));

    reorderTasks.mutate(
      {
        targetDate: todayDate,
        items: reindexed.map((task) => ({ id: task.id, sort_order: task.sort_order })),
      },
      { onError: () => setTasks(previousTasks) },
    );
  }

  if (tasks.length === 0) {
    return <EmptyState message="Тут з'явиться твій план на сьогодні — почни з Brain Dump" />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 lg:mx-auto lg:w-full lg:max-w-[620px] lg:px-0 lg:pt-6">
      {activeTasks.length === 0 ? (
        <p className="font-body text-surface-text-muted py-3 text-center text-[13px] opacity-60">
          Усі задачі на сьогодні виконані
        </p>
      ) : (
        <div className="border-surface-card-border bg-surface-card rounded-card border px-3">
          <Reorder.Group as="div" axis="y" values={activeTasks} onReorder={handleReorder}>
            {activeTasks.map((task, index) => (
              <DraggableTaskRow
                key={task.id}
                task={task}
                isLast={index === activeTasks.length - 1}
                onToggle={() => handleToggle(task)}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </Reorder.Group>
        </div>
      )}

      {doneTasks.length > 0 && (
        <>
          <SectionDivider label="Виконано" />
          <div className="border-surface-card-border bg-surface-card rounded-card border px-3">
            {doneTasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                isLast={index === doneTasks.length - 1}
                onToggle={() => handleToggle(task)}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface DraggableTaskRowProps {
  task: Task;
  isLast: boolean;
  onToggle: () => void;
  onClick: () => void;
}

// A separate component (not inlined in .map) because useDragControls must
// be called once per item, following the Rules of Hooks. dragListener is
// disabled so only the TaskRow drag handle — not the whole row — starts a
// drag (framer-motion's documented pattern for a drag handle).
function DraggableTaskRow({ task, isLast, onToggle, onClick }: DraggableTaskRowProps) {
  const dragControls = useDragControls();

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    dragControls.start(event);
  }

  return (
    <Reorder.Item
      as="div"
      value={task}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ boxShadow: "var(--shadow-glow)" }}
    >
      <TaskRow
        task={task}
        isLast={isLast}
        onToggle={onToggle}
        onClick={onClick}
        onDragHandlePointerDown={startDrag}
      />
    </Reorder.Item>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-2.5">
      <div className="bg-surface-divider h-px flex-1" />
      <span className="text-surface-text-muted font-body text-[10.5px] font-bold tracking-wide uppercase opacity-70">
        {label}
      </span>
      <div className="bg-surface-divider h-px flex-1" />
    </div>
  );
}
