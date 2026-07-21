import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  // Optional call-to-action rendered below the message (e.g. Drafts'
  // "Створити новий Brain Dump" link, UX Specification §7.6). A slot
  // rather than a label+onClick pair so callers can pass a styled Link
  // as easily as a Button.
  cta?: ReactNode;
}

// UI Specification §4 Imagery/Empty States calls for an abstract particle
// motif here (shared with the AI Processing animation) — deferred until
// that system actually exists. For now this matches the provided mockup
// exactly: text only. Shared across features (Brain Dump, Today's Plan,
// Drafts).
export function EmptyState({ message, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
      <p className="font-body text-surface-text max-w-[220px] text-[14px] leading-relaxed opacity-40">
        {message}
      </p>
      {cta}
    </div>
  );
}
