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
