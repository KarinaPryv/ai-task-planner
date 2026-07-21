"use client";

import { useMutation } from "@tanstack/react-query";

export function useConfirmBatch() {
  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const response = await fetch("/api/tasks/confirm-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: taskIds }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося підтвердити задачі.");
      }

      return body.data.confirmed as string[];
    },
  });
}
