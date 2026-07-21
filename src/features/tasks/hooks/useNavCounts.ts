"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTodayInTimezone } from "@/lib/timezone";

interface NavCounts {
  draftCount: number;
  todayCount: number;
}

// Drawer nav-item badges — draft count (UX Specification §2.3) and,
// requested alongside it, today's outstanding (not yet done) task count.
// Read directly via the client Supabase SDK (§2.3: "читання через
// клієнтський Supabase SDK"), refetched on navigation. While
// Drafts/Today's Plan are themselves mounted they publish an exact,
// optimistic-update-aware count through PageBadgeContext instead —
// Drawer prefers that over this hook's value (see Drawer.tsx), so this
// only has to stay roughly fresh, not live.
export function useNavCounts(): NavCounts {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NavCounts>({ draftCount: 0, todayCount: 0 });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle();

      const today = getTodayInTimezone(settings?.timezone ?? "UTC");

      const [draftResult, todayResult] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "confirmed")
          .eq("scheduled_date", today),
      ]);

      if (!cancelled) {
        setCounts({
          draftCount: draftResult.count ?? 0,
          todayCount: todayResult.count ?? 0,
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return counts;
}
