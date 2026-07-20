import { Logo } from "./Logo";

export type WordmarkSize = "default" | "sm";

interface WordmarkProps {
  size?: WordmarkSize;
  // "sm" only: hides the label at the lg breakpoint, for the Drawer's
  // desktop collapse rail. Not viewport-driven by itself — on mobile the
  // label always shows regardless (the open drawer is never "collapsed"
  // there), only `lg:` hides it, and only when this is true.
  collapsed?: boolean;
}

// Logo + product name, Comfortaa 700 — used standalone on Login (UI
// Specification §6 Auth, size="default") and, per §5 Drawer, reused in
// the Drawer header (size="sm" — the collapse behavior is a Drawer-only
// addition, not spec'd, kept visually consistent with the same mark
// rather than a new one). No avatar/profile chip: consistent with "AI
// has no avatar" (§1).
export function Wordmark({
  size = "default",
  collapsed = false,
}: WordmarkProps) {
  if (size === "sm") {
    return (
      <div
        className={[
          "flex items-center gap-[9px] overflow-hidden",
          collapsed ? "lg:justify-center" : "",
        ].join(" ")}
      >
        <Logo size={26} />
        <span
          className={[
            "font-accent text-surface-text text-sm font-bold whitespace-nowrap",
            collapsed ? "lg:hidden" : "",
          ].join(" ")}
        >
          AI Task Planner
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[9px] overflow-hidden">
      <Logo size={40} />
      <span className="font-accent text-brand text-surface-text leading-tight font-bold whitespace-nowrap">
        AI Task Planner
      </span>
    </div>
  );
}
