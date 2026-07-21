"use client";

import { Button } from "@/components/ui/Button";
import { useConfirmBatch } from "@/features/tasks/hooks/useConfirmBatch";

interface DateGroupHeaderProps {
  label: string;
  taskIds: string[];
  onConfirmedBatch: (taskIds: string[]) => void;
}

export function DateGroupHeader({ label, taskIds, onConfirmedBatch }: DateGroupHeaderProps) {
  const confirmBatch = useConfirmBatch();

  function handleConfirmAll() {
    confirmBatch.mutate(taskIds, { onSuccess: (confirmedIds) => onConfirmedBatch(confirmedIds) });
  }

  return (
    <div className="mb-2.5 flex items-center justify-between gap-3 px-0.5">
      <h2 className="font-accent text-surface-text text-[15px] font-bold">{label}</h2>
      <Button
        type="button"
        variant="primary"
        size="sm"
        loading={confirmBatch.isPending}
        onClick={handleConfirmAll}
      >
        Підтвердити всі ({taskIds.length})
      </Button>
    </div>
  );
}
