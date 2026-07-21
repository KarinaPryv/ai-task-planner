import { z } from "zod";

export const aiTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  priority: z.enum(["low", "medium", "high"]).nullable(),
  duration_minutes: z.number().int().positive().nullable(),
  scheduled_date: z.iso.date(),
  scheduled_time: z.iso.time().nullable(),
});

export const aiResponseSchema = z.object({
  tasks: z.array(aiTaskSchema),
  no_tasks_reason: z.string().nullable(),
});

export type AiTask = z.infer<typeof aiTaskSchema>;
export type AiResponse = z.infer<typeof aiResponseSchema>;

export const brainDumpRequestSchema = z.object({
  raw_text: z.string().min(1),
});

// Validates the `Idempotency-Key` header (Architecture.md §API — required,
// non-empty, max 255 chars; typically a client-generated UUID, but the
// format itself is not constrained).
export const idempotencyKeySchema = z
  .string({ error: "Idempotency-Key header is required." })
  .min(1, "Idempotency-Key header must not be empty.")
  .max(255, "Idempotency-Key header must be at most 255 characters.");

// Architecture.md §Voice Input — MIME types Gemini accepts for audio
// input. The client only ever produces audio/webm or audio/mp4 (the two
// MediaRecorder defaults), the rest are accepted server-side for
// completeness per the documented list.
export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/mp3",
  "audio/opus",
  "audio/flac",
] as const;

// 10MB comfortably covers the ~90s soft recording limit (UX Specification
// §4.3) at any of the above codecs' typical bitrates — a safety cap, not
// a product-facing constraint.
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// `MediaRecorder.mimeType` (and thus `File.type`) commonly includes a
// codec parameter (e.g. "audio/webm;codecs=opus") — compare against the
// base type only.
export function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim();
}

export const audioFileSchema = z
  .instanceof(File, { error: "Audio file is required." })
  .refine((file) => file.size > 0, "Audio file must not be empty.")
  .refine((file) => file.size <= MAX_AUDIO_BYTES, "Audio file is too large.")
  .refine(
    (file) => (AUDIO_MIME_TYPES as readonly string[]).includes(baseMimeType(file.type)),
    "Unsupported audio MIME type.",
  );
