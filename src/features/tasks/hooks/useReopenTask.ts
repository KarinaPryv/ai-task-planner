"use client";

import { useMutation } from "@tanstack/react-query";

export function useReopenTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/reopen`, { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося повернути задачу.");
      }

      return taskId;
    },
  });
}
