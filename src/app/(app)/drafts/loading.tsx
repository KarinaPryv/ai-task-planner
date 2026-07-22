import { Calendar, Clock, Timer, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

// See today/loading.tsx for why this exists — drafts/page.tsx also awaits
// auth + a task query before it can render anything. Mirrors TaskCard's
// real markup (card chrome, trash icon, field icons) so the real cards
// "fill in" instead of the layout jumping.
export default function DraftsLoading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-4 lg:px-10 lg:pt-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border-surface-card-border bg-surface-card rounded-card border flex flex-row">
              <div className="relative flex-1 p-4 pr-11">
                <span className="text-surface-text-muted absolute top-3 right-3 flex h-7 w-7 items-center justify-center opacity-30">
                  <Trash2 size={15} />
                </span>

                <Skeleton className="h-[15px] w-2/3 rounded-full" />
                <Skeleton className="mt-2 h-[13px] w-4/5 rounded-full" />

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Skeleton className="rounded-button h-[22px] w-20" />
                </div>

                <div className="text-surface-text-muted mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 opacity-30">
                    <Calendar size={13} />
                  </span>
                  <Skeleton className="h-[10px] w-10 rounded-full" />

                  <span className="inline-flex items-center gap-1 opacity-30">
                    <Clock size={13} />
                  </span>
                  <Skeleton className="h-[10px] w-8 rounded-full" />

                  <span className="inline-flex items-center gap-1 opacity-30">
                    <Timer size={13} />
                  </span>
                  <Skeleton className="h-[10px] w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
