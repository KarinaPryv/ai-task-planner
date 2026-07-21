interface CountBadgeProps {
  count: number;
}

// UX Specification §2.3 — numeric badge for a draft/today count. Fixed
// brand-accent tint regardless of atmosphere (same precedent as Drawer's
// active-nav-item highlight: bg-brand-accent/[0.18] text-brand-accent) —
// this is chrome, not a semantic priority Badge, so it doesn't need
// light/dark surface adaptivity. text-surface-toast-undo already gives
// the right coral tone per surface (darker on light, lighter on dark).
export function CountBadge({ count }: CountBadgeProps) {
  return (
    <span className="bg-brand-accent/[0.22] text-surface-toast-undo font-body inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold">
      {count}
    </span>
  );
}
