"use client";

import { useMutation } from "@tanstack/react-query";

interface ReorderVariables {
  targetDate: string;
  items: { id: string; sort_order: number }[];
}

export function useReorderTasks() {
  return useMutation({
    mutationFn: async ({ targetDate, items }: ReorderVariables) => {
      const response = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_date: targetDate, items }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Не вдалося змінити порядок задач.");
      }

      return items;
    },
  });
}
