import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { confirmBatchSchema } from "@/features/tasks/schema";

// POST /api/tasks/confirm-batch — confirms a client-chosen set of draft
// tasks in one request (e.g. "Підтвердити всі" for a Draft Review date
// group). Replaces the earlier brain_dump_entry_id-scoped
// confirm-remaining endpoint now that Draft Review groups by date, not by
// batch (Architecture.md §Масові дії).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Not authenticated.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsedBody = confirmBatchSchema.safeParse(body);

  if (!parsedBody.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body.", 400, parsedBody.error.flatten());
  }

  const { data: confirmed, error } = await supabase
    .from("tasks")
    .update({ status: "confirmed" })
    .in("id", parsedBody.data.ids)
    .eq("status", "draft")
    .select("id");

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to confirm tasks.", 500);
  }

  return apiSuccess({ confirmed: (confirmed ?? []).map((task) => task.id) }, 200);
}
