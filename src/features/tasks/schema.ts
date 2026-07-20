import { z } from "zod";

// PATCH /api/tasks/:id body (Architecture.md §Tasks — редагування). Each
// field resets its own *_is_suggestion flag to false when provided; fields
// omitted from the request are left untouched.
export const patchTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    duration_minutes: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
