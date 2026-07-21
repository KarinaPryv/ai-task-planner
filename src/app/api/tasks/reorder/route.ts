import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { reorderTasksSchema } from "@/features/tasks/schema";

// PATCH /api/tasks/reorder — Today's Plan drag&drop, active (confirmed)
// zone only (Architecture.md §Reorder). Delegates the atomic batch-update
// and ownership/status/date validation to the reorder_tasks RPC.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Not authenticated.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsedBody = reorderTasksSchema.safeParse(body);

  if (!parsedBody.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body.", 400, parsedBody.error.flatten());
  }

  const { target_date, items } = parsedBody.data;

  const { error } = await supabase.rpc("reorder_tasks", {
    p_items: items,
    p_target_date: target_date,
  });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to reorder tasks.", 500);
  }

  return apiSuccess({ target_date, items }, 200);
}
