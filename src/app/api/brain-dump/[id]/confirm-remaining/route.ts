import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";

const brainDumpEntryIdSchema = z.uuid();

// POST /api/brain-dump/:id/confirm-remaining — confirms every draft task
// belonging to this entry at request time (Architecture.md §Масові дії).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Not authenticated.", 401);
  }

  const parsedId = brainDumpEntryIdSchema.safeParse((await params).id);

  if (!parsedId.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid brain dump entry id.",
      400,
      parsedId.error.flatten(),
    );
  }

  const { data: confirmed, error } = await supabase
    .from("tasks")
    .update({ status: "confirmed" })
    .eq("brain_dump_entry_id", parsedId.data)
    .eq("status", "draft")
    .select("id");

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to confirm tasks.", 500);
  }

  return apiSuccess({ confirmed: (confirmed ?? []).map((task) => task.id) }, 200);
}
