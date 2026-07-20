import { createClient } from "@/lib/supabase/server";
import {
  GeminiProviderError,
  GeminiRateLimitError,
  GeminiUnavailableError,
  generateTasksFromText,
} from "@/lib/ai/gemini";
import {
  aiResponseSchema,
  brainDumpRequestSchema,
  idempotencyKeySchema,
} from "@/features/brain-dump/schema";
import { apiError, apiSuccess } from "@/lib/api/response";

const ENDPOINT = "POST /api/brain-dump";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Not authenticated.", 401);
  }

  const parsedKey = idempotencyKeySchema.safeParse(request.headers.get("Idempotency-Key"));

  if (!parsedKey.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Missing or invalid Idempotency-Key header.",
      400,
      parsedKey.error.flatten(),
    );
  }

  const idempotencyKey = parsedKey.data;

  const body = await request.json().catch(() => null);
  const parsedRequest = brainDumpRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid request body.",
      400,
      parsedRequest.error.flatten(),
    );
  }

  // Step 1: claim the idempotency key. PRIMARY KEY (user_id, key, endpoint)
  // guarantees only one concurrent request wins the INSERT
  // (Architecture.md §POST /api/brain-dump).
  const { error: insertError } = await supabase
    .from("idempotency_keys")
    .insert({ user_id: user.id, key: idempotencyKey, endpoint: ENDPOINT });

  if (insertError) {
    if (insertError.code !== "23505") {
      return apiError("INTERNAL_ERROR", "Failed to register request.", 500);
    }

    const { data: existing, error: fetchError } = await supabase
      .from("idempotency_keys")
      .select("status, response_status, response_body")
      .eq("user_id", user.id)
      .eq("key", idempotencyKey)
      .eq("endpoint", ENDPOINT)
      .single();

    if (fetchError || !existing) {
      return apiError("INTERNAL_ERROR", "Failed to look up existing request.", 500);
    }

    if (existing.status === "completed") {
      return apiSuccess(existing.response_body, existing.response_status ?? 201);
    }

    if (existing.status === "processing") {
      return apiError(
        "REQUEST_IN_PROGRESS",
        "An identical request is already being processed.",
        409,
      );
    }

    // status === 'failed': atomically reclaim it. If this affects zero
    // rows, a concurrent request already reclaimed it first.
    const { data: reclaimed, error: reclaimError } = await supabase
      .from("idempotency_keys")
      .update({ status: "processing" })
      .eq("user_id", user.id)
      .eq("key", idempotencyKey)
      .eq("endpoint", ENDPOINT)
      .eq("status", "failed")
      .select("key");

    if (reclaimError) {
      return apiError("INTERNAL_ERROR", "Failed to reclaim request.", 500);
    }

    if (!reclaimed || reclaimed.length === 0) {
      return apiError(
        "REQUEST_IN_PROGRESS",
        "An identical request is already being processed.",
        409,
      );
    }
  }

  const markFailed = () =>
    supabase
      .from("idempotency_keys")
      .update({ status: "failed" })
      .eq("user_id", user.id)
      .eq("key", idempotencyKey)
      .eq("endpoint", ENDPOINT);

  const todayIsoDate = new Date().toISOString().slice(0, 10);

  let rawResponseText: string;
  try {
    rawResponseText = await generateTasksFromText(parsedRequest.data.raw_text, todayIsoDate);
  } catch (error) {
    await markFailed();

    if (error instanceof GeminiRateLimitError) {
      return apiError("AI_RATE_LIMITED", "Gemini rate limit exceeded.", 429);
    }

    if (error instanceof GeminiUnavailableError) {
      return apiError("AI_UNAVAILABLE", "AI provider is unavailable. Try again.", 503);
    }

    if (error instanceof GeminiProviderError) {
      return apiError("AI_PROVIDER_ERROR", "AI provider returned an error.", 502);
    }

    return apiError("INTERNAL_ERROR", "Unexpected error calling the AI provider.", 500);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawResponseText);
  } catch {
    await markFailed();
    return apiError("AI_INVALID_RESPONSE", "AI returned a non-JSON response.", 502);
  }

  const parsedAiResponse = aiResponseSchema.safeParse(parsedJson);

  if (!parsedAiResponse.success) {
    await markFailed();
    return apiError(
      "AI_INVALID_RESPONSE",
      "AI response did not match the expected schema.",
      502,
    );
  }

  if (parsedAiResponse.data.tasks.length === 0) {
    await markFailed();
    return apiError(
      "AI_COULD_NOT_PARSE_TASKS",
      parsedAiResponse.data.no_tasks_reason ?? "No tasks found.",
      422,
    );
  }

  // Apply defaults and *_is_suggestion logic (Architecture.md §Пост-обробка).
  const tasksForRpc = parsedAiResponse.data.tasks.map((task) => ({
    title: task.title,
    description: task.description,
    priority: task.priority ?? "medium",
    priority_is_suggestion: task.priority === null,
    duration_minutes: task.duration_minutes ?? 30,
    duration_is_suggestion: task.duration_minutes === null,
    scheduled_date: task.scheduled_date,
    scheduled_time: task.scheduled_time,
  }));

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "create_brain_dump_with_tasks",
    {
      p_raw_text: parsedRequest.data.raw_text,
      p_tasks: tasksForRpc,
      p_idempotency_key: idempotencyKey,
      p_endpoint: ENDPOINT,
    },
  );

  if (rpcError) {
    await markFailed();
    return apiError("INTERNAL_ERROR", "Failed to save brain dump.", 500);
  }

  return apiSuccess(rpcResult, 201);
}
