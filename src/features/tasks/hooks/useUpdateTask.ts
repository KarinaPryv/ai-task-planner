"use client";

import { useMutation } from "@tanstack/react-query";
import type { PatchTaskInput } from "@/features/tasks/schema";
import type { Task } from "@/features/tasks/types";

interface UpdateTaskVariables {
  taskId: string;
  patch: PatchTaskInput;
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: async ({ taskId, patch }: UpdateTaskVariables) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося зберегти зміни.");
      }

      return body.data as Task;
    },
  });
}
