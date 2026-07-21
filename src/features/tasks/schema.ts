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
    scheduled_date: z.iso.date().optional(),
    scheduled_time: z.iso.time().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export type PatchTaskInput = z.infer<typeof patchTaskSchema>;

// POST /api/tasks/confirm-batch body — confirms an arbitrary, client-chosen
// set of draft tasks (e.g. "Підтвердити всі" for one date group within a
// Draft Review batch). Deliberately not scoped by brain_dump_entry_id: the
// client already knows exactly which task ids are visible in the group it's
// confirming.
export const confirmBatchSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
});

export type ConfirmBatchInput = z.infer<typeof confirmBatchSchema>;
