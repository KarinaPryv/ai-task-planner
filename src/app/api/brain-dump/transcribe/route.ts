import { createClient } from "@/lib/supabase/server";
import {
  GeminiProviderError,
  GeminiRateLimitError,
  GeminiUnavailableError,
  transcribeAudio,
} from "@/lib/ai/gemini";
import { audioFileSchema, baseMimeType } from "@/features/brain-dump/schema";
import { apiError, apiSuccess } from "@/lib/api/response";

// No Idempotency-Key: doesn't create any DB records, safe to retry
// (Architecture.md §Voice Input — транскрипція диктування).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Not authenticated.", 401);
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return apiError("VALIDATION_ERROR", "Invalid multipart/form-data body.", 400);
  }

  const parsedAudio = audioFileSchema.safeParse(formData.get("audio"));

  if (!parsedAudio.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid or missing audio file.",
      400,
      parsedAudio.error.flatten(),
    );
  }

  const audioFile = parsedAudio.data;
  const audioBuffer = await audioFile.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");

  let text: string;
  try {
    text = await transcribeAudio(audioBase64, baseMimeType(audioFile.type));
  } catch (error) {
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

  return apiSuccess({ text });
}
