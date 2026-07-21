import { AlertTriangle } from "lucide-react";
import { formatDuration } from "../lib/format-date";

interface OverloadBannerProps {
  totalMinutes: number;
}

// day_overload warning — a snapshot from creation time (see types.ts),
// shown as long as at least one task from that date group is still in
// Review, even if the total no longer literally adds up after edits.
export function OverloadBanner({ totalMinutes }: OverloadBannerProps) {
  return (
    <div className="bg-badge-high text-badge-high-fg rounded-button mb-2.5 flex items-center gap-2 px-3 py-2 text-[12px] font-medium">
      <AlertTriangle size={14} className="shrink-0" />
      Забагато задач на цей день — {formatDuration(totalMinutes)} (більше 8 год)
    </div>
  );
}
