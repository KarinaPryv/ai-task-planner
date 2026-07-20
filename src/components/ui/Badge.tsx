import type { ReactNode } from "react";

export type BadgeVariant = "low" | "medium" | "high" | "ai-suggestion";

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

// UI Specification §5 Badge — semantic tint pair (§2 Semantic Palette),
// light/dark surface aware via the [data-surface]-driven tokens in
// styles/time-of-day.css. Max 2 badges per card is a spec rule for
// callers to respect (e.g. Task Card), not something this component can
// enforce on its own.
//
// Note: §1's general typography rule states badges use Comfortaa, but
// §5's own Badge anatomy explicitly specifies "текст (Manrope 700,
// 11–12px)" — a real inconsistency between the two sections of the
// spec. This follows §5 (the more specific, component-level spec).
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  low: "bg-badge-low text-badge-low-fg",
  medium: "bg-badge-medium text-badge-medium-fg",
  high: "bg-badge-high text-badge-high-fg",
  "ai-suggestion": "bg-badge-ai text-badge-ai-fg",
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={[
        "rounded-button inline-flex items-center gap-1 px-2.5 py-1 font-body text-[11px] font-bold",
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
