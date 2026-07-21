import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";

const taskIdSchema = z.uuid();

// POST /api/tasks/:id/restore — Undo toast (UX Specification §8.4). A
// soft-deleted row is invisible to a plain select/update under
// tasks_select_own, so this delegates to the restore_task security-definer
// RPC, which performs its own auth/ownership/deleted_at checks.
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

  const { data: restored, error } = await supabase.rpc("restore_task", {
    p_task_id: parsedId.data,
  });

  if (error || !restored) {
    return apiError("NOT_FOUND", "Task not found or already restored.", 404);
  }

  return apiSuccess(restored, 200);
}
