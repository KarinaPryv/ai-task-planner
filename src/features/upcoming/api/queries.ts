import type { createClient } from "@/lib/supabase/server";
import type { Task } from "@/features/tasks/types";

// Upcoming board reads (UX Specification §10) — direct Supabase SDK, no
// Route Handler (Architecture.md: "читання йде напряму з клієнта через
// Supabase SDK + RLS"). confirmed + done (draft never appears here —
// lives on Drafts). Done tasks render in their own dimmed group per day
// (product decision, overriding §10.5's original "done не показуються").
export async function getUpcomingRangeTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startDate: string,
  endDate: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["confirmed", "done"])
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load upcoming tasks: ${error.message}`);
  }

  return data ?? [];
}

// Overdue column (§10.3) — every confirmed task scheduled before
// beforeDate, regardless of how far in the past, independent of the
// current week's range.
export async function getOverdueTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  beforeDate: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "confirmed")
    .lt("scheduled_date", beforeDate)
    .order("scheduled_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load overdue tasks: ${error.message}`);
  }

  return data ?? [];
}
