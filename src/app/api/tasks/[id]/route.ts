import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { patchTaskSchema } from "@/features/tasks/schema";

const taskIdSchema = z.uuid();

async function loadOwnTaskStatus(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string) {
  return supabase.from("tasks").select("status").eq("id", taskId).maybeSingle();
}

// PATCH /api/tasks/:id — edit draft/confirmed tasks; 403 TASK_READ_ONLY for
// done (Architecture.md §Tasks — редагування).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const body = await request.json().catch(() => null);
  const parsedBody = patchTaskSchema.safeParse(body);

  if (!parsedBody.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body.", 400, parsedBody.error.flatten());
  }

  const { data: existing, error: fetchError } = await loadOwnTaskStatus(supabase, taskId);

  if (fetchError) {
    return apiError("INTERNAL_ERROR", "Failed to look up task.", 500);
  }

  if (!existing) {
    return apiError("NOT_FOUND", "Task not found.", 404);
  }

  if (existing.status === "done") {
    return apiError("TASK_READ_ONLY", "Cannot edit a completed task.", 403);
  }

  const { title, description, priority, duration_minutes, scheduled_date, scheduled_time } =
    parsedBody.data;
  const updatePayload: Record<string, unknown> = {};

  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (scheduled_date !== undefined) updatePayload.scheduled_date = scheduled_date;
  if (scheduled_time !== undefined) updatePayload.scheduled_time = scheduled_time;

  if (priority !== undefined) {
    updatePayload.priority = priority;
    updatePayload.priority_is_suggestion = false;
  }

  if (duration_minutes !== undefined) {
    updatePayload.duration_minutes = duration_minutes;
    updatePayload.duration_is_suggestion = false;
  }

  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select()
    .single();

  if (updateError || !updated) {
    return apiError("INTERNAL_ERROR", "Failed to update task.", 500);
  }

  return apiSuccess(updated, 200);
}

// DELETE /api/tasks/:id — real delete for draft/confirmed; 403 TASK_READ_ONLY
// for done (Architecture.md §Tasks — редагування).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: existing, error: fetchError } = await loadOwnTaskStatus(supabase, taskId);

  if (fetchError) {
    return apiError("INTERNAL_ERROR", "Failed to look up task.", 500);
  }

  if (!existing) {
    return apiError("NOT_FOUND", "Task not found.", 404);
  }

  if (existing.status === "done") {
    return apiError("TASK_READ_ONLY", "Cannot delete a completed task.", 403);
  }

  const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId);

  if (deleteError) {
    return apiError("INTERNAL_ERROR", "Failed to delete task.", 500);
  }

  return apiSuccess({ id: taskId }, 200);
}
