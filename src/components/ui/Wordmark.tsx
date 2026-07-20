import { SparkIcon } from "./SparkIcon";

// Spark motif + product name, Comfortaa 700 — used standalone on Login
// (UI Specification §6 Auth) and, per §5 Drawer, reused unchanged in the
// Drawer header. No avatar/profile chip: consistent with "AI has no
// avatar" (§1). Exact sizing/spacing/color confirmed via Figma (node
// 8:93..8:103, file KJdzlOzt7AbKUXca1gmpDk).
export function Wordmark() {
  return (
    <div className="flex flex-col items-center gap-[9px]">
      <SparkIcon size={40} className="text-brand-accent" />
      <span className="font-accent text-brand font-bold leading-tight text-surface-text">
        AI Task Planner
      </span>
    </div>
  );
}
