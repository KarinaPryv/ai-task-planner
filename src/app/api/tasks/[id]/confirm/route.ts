import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";

const taskIdSchema = z.uuid();

// POST /api/tasks/:id/confirm — draft -> confirmed (Architecture.md §Tasks — статуси).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Not authenticated.", 401);
  }

  const parsedId = taskIdSchema.safeParse((await params).id);

  if (!parsedId.success) {
    return apiError("NOT_FOUND", "Task not found.", 404);
  }

  const taskId = parsedId.data;

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError) {
    return apiError("INTERNAL_ERROR", "Failed to look up task.", 500);
  }

  if (!existing) {
    return apiError("NOT_FOUND", "Task not found.", 404);
  }

  if (existing.status !== "draft") {
    return apiError(
      "INVALID_STATUS_TRANSITION",
      `Cannot confirm a task with status "${existing.status}".`,
      409,
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update({ status: "confirmed" })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError || !updated) {
    return apiError("INTERNAL_ERROR", "Failed to confirm task.", 500);
  }

  return apiSuccess(updated, 200);
}
