"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Architecture.md §Timezone previously left this as a known gap: every
// server read of "today" (Today's Plan, Upcoming) falls back to
// user_settings.timezone's default of 'UTC' until something actually
// writes the user's real timezone there. That mismatch is exactly why
// "today" server-side could lag a full day behind the browser's actual
// local date (e.g. it's already past midnight locally but not yet in
// UTC) — client-only date labels (formatDateGroupLabel) were always
// correct since they read the browser's clock directly; only the
// server-computed "today" used to decide *what to fetch* was wrong.
//
// This runs once per app mount, compares the browser's IANA timezone
// against what's stored, and PATCHes it (a plain client update is safe
// here — RLS's SELECT policy for user_settings doesn't reference
// timezone, so this never hits the RETURNING/RLS-visibility gotcha that
// tasks' soft-delete needed a security-definer RPC for). A successful
// change triggers router.refresh() so the current page's server
// components re-read with the corrected timezone immediately, instead of
// only taking effect on the next navigation.
export function useTimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    async function sync() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled || !settings || settings.timezone === browserTimezone) return;

      const { error } = await supabase
        .from("user_settings")
        .update({ timezone: browserTimezone })
        .eq("user_id", user.id);

      if (!error && !cancelled) router.refresh();
    }

    sync();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount; router identity is stable for the app's lifetime
  }, []);
}
