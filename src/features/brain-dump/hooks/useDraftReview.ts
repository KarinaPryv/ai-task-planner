"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/features/tasks/types";
import type { BrainDumpResponse } from "../types";

function reviewKey(userId: string) {
  return `brain-dump-review:${userId}`;
}

// Draft Review is session state, not a database read: warnings
// (day_overload/time_conflict) only ever exist in a POST /api/brain-dump
// response, never persisted on the tasks table (UX Specification §6.5 —
// "computed once, never recalculated"). Each submission's response is
// appended here as a batch; batch dividers on the Review screen are a
// rendering of this array, not a query across brain_dump_entries.
// Persisted to localStorage per-user (mirrors useDraftText) so an
// accidental refresh doesn't lose an unreviewed batch.
export function useDraftReview() {
  const [userId, setUserId] = useState<string | null>(null);
  const [batches, setBatches] = useState<BrainDumpResponse[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const stored = window.localStorage.getItem(reviewKey(userId));

    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reads an external system (localStorage) on mount
        setBatches(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(reviewKey(userId));
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    if (batches.length > 0) {
      window.localStorage.setItem(reviewKey(userId), JSON.stringify(batches));
    } else {
      window.localStorage.removeItem(reviewKey(userId));
    }
  }, [userId, batches]);

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
