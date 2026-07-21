import type { createClient } from "@/lib/supabase/server";
import type { Task } from "@/features/tasks/types";

// Today's Plan read — direct Supabase SDK + RLS, no Route Handler
// (Architecture.md: "читання йде напряму з клієнта через Supabase SDK +
// RLS, минаючи API"). confirmed + done only — drafts live on the Drafts
// screen, not here.
export async function getTodayTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["confirmed", "done"])
    .eq("scheduled_date", date)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load today's tasks: ${error.message}`);
  }

  return data ?? [];
}

// Drafts read (UX Specification §7.2) — every draft task, newest
// created_at first, no scheduled_date grouping (unlike Today's Plan).
export async function getDraftTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load draft tasks: ${error.message}`);
  }

  return data ?? [];
}
