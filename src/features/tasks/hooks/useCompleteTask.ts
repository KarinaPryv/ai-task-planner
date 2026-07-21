"use client";

import { useMutation } from "@tanstack/react-query";

export function useCompleteTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося позначити задачу виконаною.");
      }

      return taskId;
    },
  });
}
