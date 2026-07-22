import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

// See today/loading.tsx for why this exists — upcoming/page.tsx awaits
// auth, settings, and two task queries (range + overdue) before it can
// render anything. Mirrors UpcomingBoard/DayColumn/UpcomingTaskRow's real
// markup (nav bar, board card, column headers, row chrome) so the real
// board "fills in" instead of the layout jumping.
export default function UpcomingLoading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center gap-2 px-4 pt-1.5 pb-3.5">
        <span className="text-surface-text-muted flex h-9 w-9 shrink-0 items-center justify-center opacity-30">
          <ChevronLeft size={18} />
        </span>

        <span className="border-surface-secondary-btn-border bg-surface-secondary-btn text-surface-text-muted flex w-[264px] items-center justify-center gap-1.5 rounded-full border px-4 py-2 opacity-60">
          <CalendarIcon size={15} />
          <Skeleton className="h-[13px] w-32 rounded-full" />
        </span>

        <span className="text-surface-text flex h-9 w-9 shrink-0 items-center justify-center opacity-40">
          <ChevronRight size={18} />
        </span>
      </div>

      <div className="border-surface-card-border bg-surface-card relative mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border lg:mx-10 max-w-[1442px]">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="border-surface-card-border flex w-full shrink-0 flex-col border-r last:border-r-0 lg:w-[240px]"
            >
              <div className="flex shrink-0 items-center justify-center gap-1.5 py-4">
                <Skeleton className="h-3 w-6 rounded-full" />
                <Skeleton className="h-3.5 w-3 rounded-full" />
              </div>

              <div className="flex-1 overflow-y-auto px-4">
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={`flex w-full items-center justify-between gap-2 py-3 ${rowIndex < 2 ? "border-surface-card-border border-b" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <Skeleton className="h-[13px] w-4/5 rounded-full" />
                      <Skeleton className="mt-1.5 h-[10px] w-1/3 rounded-full" />
                    </span>
                    <Skeleton className="rounded-button h-[20px] w-11 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 justify-center gap-1.5 py-2.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="bg-surface-text/15 h-1.5 w-1.5 rounded-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
