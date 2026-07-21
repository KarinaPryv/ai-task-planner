interface EmptyStateProps {
  message: string;
}

// UI Specification §4 Imagery/Empty States calls for an abstract particle
// motif here (shared with the AI Processing animation) — deferred until
// that system actually exists. For now this matches the provided mockup
// exactly: text only. Shared across features (Brain Dump, Today's Plan).
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-5 text-center">
      <p className="font-body text-surface-text max-w-[220px] text-[14px] leading-relaxed opacity-40">
        {message}
      </p>
    </div>
  );
}
