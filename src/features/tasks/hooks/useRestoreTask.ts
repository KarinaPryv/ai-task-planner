"use client";

import { useMutation } from "@tanstack/react-query";
import type { Task } from "@/features/tasks/types";

export function useRestoreTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/restore`, { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося відновити задачу.");
      }

      return body.data as Task;
    },
  });
}
