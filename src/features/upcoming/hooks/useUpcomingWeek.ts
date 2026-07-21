"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDaysIso, mondayOfIso } from "@/lib/date";
import type { Task } from "@/features/tasks/types";

interface UseUpcomingWeekArgs {
  today: string;
  initialWeekStart: string;
  initialTasks: Task[];
}

type SupabaseBrowserClient = ReturnType<typeof createClient>;

function weekStartForIndex(index: number, initialWeekStart: string, currentWeekMonday: string): string {
  return index === 0 ? initialWeekStart : addDaysIso(currentWeekMonday, index * 7);
}

// Week 0 is the trimmed "today → нд" range plus everything overdue
// (§10.3); every other week is a plain full пн–нд range with no overdue
// concept (a future week can never contain a date before today). Range
// queries include confirmed + done (done renders in its own dimmed group
// per day); overdue stays confirmed-only — a done task isn't "overdue"
// anymore, it's just finished late.
async function fetchTasksForWeek(
  supabase: SupabaseBrowserClient,
  weekIndex: number,
  today: string,
  weekStart: string,
  weekEnd: string,
): Promise<Task[]> {
  if (weekIndex === 0) {
    const [rangeResult, overdueResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .in("status", ["confirmed", "done"])
        .gte("scheduled_date", today)
        .lte("scheduled_date", weekEnd)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tasks")
        .select("*")
        .eq("status", "confirmed")
        .lt("scheduled_date", today)
        .order("scheduled_date", { ascending: true }),
    ]);

    if (rangeResult.error) throw new Error(rangeResult.error.message);
    if (overdueResult.error) throw new Error(overdueResult.error.message);

    return [...(overdueResult.data ?? []), ...(rangeResult.data ?? [])];
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["confirmed", "done"])
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekEnd)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Upcoming week navigation (UX Specification §10.2). Week 0 is seeded
// from the server-rendered fetch (page.tsx); every other week is fetched
// on demand via the client Supabase SDK (Architecture.md: reads bypass
// the API), and cached in memory per weekIndex so paging back to an
// already-visited week is instant. weekIndex/tasks change together, only
// once the target week's data is actually ready — in-place edits to the
// currently-viewed week (via the returned setTasks) never touch
// weekIndex, so callers can safely reset scroll position on weekIndex
// changes alone without it firing on every optimistic edit.
export function useUpcomingWeek({ today, initialWeekStart, initialTasks }: UseUpcomingWeekArgs) {
  const [weekIndex, setWeekIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<number, Task[]>>(new Map([[0, initialTasks]]));
  const requestedIndexRef = useRef(0);

  const currentWeekMonday = mondayOfIso(today);
  const weekStart = weekStartForIndex(weekIndex, initialWeekStart, currentWeekMonday);
  const weekEnd = addDaysIso(weekStart, 6);
  const rangeStart = weekIndex === 0 ? today : weekStart;

  const goToWeekIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, nextIndex);
      if (clamped === weekIndex || clamped === requestedIndexRef.current) return;

      requestedIndexRef.current = clamped;

      const cached = cacheRef.current.get(clamped);
      if (cached) {
        setWeekIndex(clamped);
        setTasks(cached);
        return;
      }

      setIsLoading(true);

      const start = weekStartForIndex(clamped, initialWeekStart, currentWeekMonday);
      const end = addDaysIso(start, 6);
      const supabase = createClient();

      fetchTasksForWeek(supabase, clamped, today, start, end)
        .then((result) => {
          cacheRef.current.set(clamped, result);
          if (requestedIndexRef.current === clamped) {
            setWeekIndex(clamped);
            setTasks(result);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (requestedIndexRef.current === clamped) setIsLoading(false);
        });
    },
    [weekIndex, today, initialWeekStart, currentWeekMonday],
  );

  return { weekIndex, weekStart, weekEnd, rangeStart, tasks, setTasks, isLoading, goToWeekIndex };
}
