export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "draft" | "confirmed" | "done";

// Mirrors the `tasks` table (supabase/migrations/20260720120000_...), minus
// user_id which route handlers never expose to the client.
export interface Task {
  id: string;
  brain_dump_entry_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  priority_is_suggestion: boolean;
  duration_minutes: number;
  duration_is_suggestion: boolean;
  scheduled_date: string;
  scheduled_time: string | null;
  status: TaskStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
