"use client";

import { useState } from "react";
import type { Task } from "@/features/tasks/types";
import type { BrainDumpResponse } from "../types";

// Draft Review is in-memory only, scoped to the current Brain Dump page
// visit — deliberately NOT persisted (it used to be, via localStorage,
// before Drafts existed). A reload or navigating away and back now
// always starts this empty, so Brain Dump reads as a clean "generate"
// surface rather than accumulating old batches. Nothing is lost: any
// draft not yet confirmed/deleted is still sitting in the tasks table
// with status='draft' and shows up on /drafts, which is now the
// permanent place to review/edit it (UX Specification §7).
export function useDraftReview() {
  const [batches, setBatches] = useState<BrainDumpResponse[]>([]);

  function addBatch(response: BrainDumpResponse) {
    setBatches((prev) => [...prev, response]);
  }

  // Confirm and delete both mean "leave the Review list" — this screen
  // only ever shows drafts.
  function removeTasks(taskIds: string[]) {
    const idSet = new Set(taskIds);

    setBatches((prev) =>
      prev
        .map((batch) => ({ ...batch, tasks: batch.tasks.filter((task) => !idSet.has(task.id)) }))
        .filter((batch) => batch.tasks.length > 0),
    );
  }

  // Local-only patch, applied after a PATCH round-trip succeeds (or
  // straight away for optimistic fields, with the caller reverting via a
  // second call to this same function on failure). A scheduled_date
  // change naturally moves the task's rendered position: groupBatch()
  // re-buckets by scheduled_date on every render, it's not tracked here.
  function updateTask(taskId: string, patch: Partial<Task>) {
    setBatches((prev) =>
      prev.map((batch) => ({
        ...batch,
        tasks: batch.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      })),
    );
  }

  return { batches, addBatch, removeTasks, updateTask };
}
