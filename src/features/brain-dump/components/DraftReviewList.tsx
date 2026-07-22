"use client";

import { AnimatePresence } from "framer-motion";
import { TaskCard } from "@/features/tasks/components/TaskCard";
import type { Task } from "@/features/tasks/types";
import { BatchDivider } from "./BatchDivider";
import { DateGroupHeader } from "./DateGroupHeader";
import { OverloadBanner } from "./OverloadBanner";
import { groupBatch } from "../lib/group-batches";
import { formatBatchTimestamp, formatDateGroupLabel } from "../lib/format-date";
import type { BrainDumpResponse } from "../types";

interface DraftReviewListProps {
  batches: BrainDumpResponse[];
  onTasksConfirmedOrDeleted: (taskIds: string[]) => void;
  // Confirm-only signal, carrying full tasks (not just ids) — the page
  // needs each task's scheduled_date to know which confirms count toward
  // today's live badge total (see BrainDumpPage). Delete never fires this.
  onTasksConfirmed: (tasks: Task[]) => void;
  onTaskUpdated: (taskId: string, patch: Partial<Task>) => void;
}

// A single AnimatePresence spans every batch/date group so a card edited
// into a new scheduled_date can animate from its old group's grid to its
// new one (see TaskCard's layoutId comment) instead of just jumping.
export function DraftReviewList({
  batches,
  onTasksConfirmedOrDeleted,
  onTasksConfirmed,
  onTaskUpdated,
}: DraftReviewListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 lg:px-10 lg:pt-6">
      {batches.map((batch, index) => {
        const grouped = groupBatch(batch);

        return (
          <div key={batch.brainDumpEntry.id}>
            {index > 0 && (
              <BatchDivider label={formatBatchTimestamp(batch.brainDumpEntry.created_at)} />
            )}

            {grouped.dateGroups.map((group) => (
              <div key={group.date} className="mb-5">
                <DateGroupHeader
                  label={formatDateGroupLabel(group.date)}
                  taskIds={group.tasks.map((task) => task.id)}
                  onConfirmedBatch={(confirmedIds) => {
                    const confirmedIdSet = new Set(confirmedIds);
                    onTasksConfirmed(group.tasks.filter((task) => confirmedIdSet.has(task.id)));
                    onTasksConfirmedOrDeleted(confirmedIds);
                  }}
                />

                {group.overloadWarning && (
                  <OverloadBanner totalMinutes={group.overloadWarning.total_minutes} />
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <AnimatePresence>
                    {group.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        conflictingTitles={grouped.conflictTitlesByTaskId.get(task.id)}
                        onConfirmed={(taskId) => {
                          onTasksConfirmed([task]);
                          onTasksConfirmedOrDeleted([taskId]);
                        }}
                        onDeleted={(taskId) => onTasksConfirmedOrDeleted([taskId])}
                        onUpdated={onTaskUpdated}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
