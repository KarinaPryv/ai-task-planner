interface BatchDividerProps {
  label: string;
}

// Separates two distinct Brain Dump submissions accumulated in the same
// Draft Review session (not a database boundary — see useDraftReview).
export function BatchDivider({ label }: BatchDividerProps) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="bg-surface-divider h-px flex-1" />
      <span className="text-surface-text-muted font-body text-[11px] font-medium tracking-wide whitespace-nowrap uppercase">
        {label}
      </span>
      <div className="bg-surface-divider h-px flex-1" />
    </div>
  );
}
