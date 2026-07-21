"use client";

import { useMutation } from "@tanstack/react-query";

export function useDeleteTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося видалити задачу.");
      }

      return taskId;
    },
  });
}
