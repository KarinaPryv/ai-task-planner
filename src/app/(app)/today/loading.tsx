import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

// Shown instantly by the Suspense boundary Next.js wraps around this
// segment while today/page.tsx's sequential Supabase queries (auth,
// settings, tasks) are still resolving on the server — without this file
// App Router blocks the transition until that whole chain finishes.
// Mirrors TodayPlanList/TaskRow's real markup (same card, same row
// chrome) so the real content "fills in" instead of the layout jumping.
export default function TodayLoading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4 lg:mx-auto lg:w-full lg:max-w-[620px] lg:px-0 lg:pt-6">
        <div className="border-surface-card-border bg-surface-card rounded-card border px-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 py-2.5 ${index < 4 ? "border-surface-card-border border-b" : ""}`}
            >
              <span className="rounded-checkbox border-surface-checkbox-border h-[19px] w-[19px] shrink-0 border-2" />

              <span className="min-w-0 flex-1 flex items-center gap-2">
                <Skeleton className="h-[7px] w-[7px] shrink-0 rounded-full" />
                <span className="min-w-0 flex-1">
                  <Skeleton className="h-[13px] w-3/5 rounded-full" />
                  <Skeleton className="mt-1.5 h-[10px] w-1/4 rounded-full" />
                </span>
              </span>

              <Skeleton className="h-[11px] w-9 shrink-0 rounded-full" />
              <ChevronRight size={9} className="text-surface-text-muted shrink-0 opacity-35" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
