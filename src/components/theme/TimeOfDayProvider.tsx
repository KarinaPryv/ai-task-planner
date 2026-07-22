"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getSurface,
  getTimeOfDay,
  getTimeOfDayLabelUk,
  msUntilNextBoundary,
  type Surface,
  type TimeOfDay,
} from "./time-of-day";

interface TimeOfDayContextValue {
  theme: TimeOfDay;
  surface: Surface;
  label: string;
}

export const TimeOfDayContext = createContext<TimeOfDayContextValue | null>(null);

function applyToDocument(theme: TimeOfDay, surface: Surface) {
  document.documentElement.setAttribute("data-time-theme", theme);
  document.documentElement.setAttribute("data-surface", surface);
}

// Keeps html[data-time-theme]/[data-surface] in sync while the tab stays
// open. The initial value matches what the no-flash inline script
// (theme-script.ts) already wrote to <html> before hydration, so this
// does not cause a visible flash on mount — it only re-syncs going
// forward, scheduled exactly to the next boundary crossing (not
// polling), plus a recompute on visibilitychange in case the boundary
// was crossed while the tab was asleep/hidden.
export function TimeOfDayProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<TimeOfDay>(() => getTimeOfDay(new Date()));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const sync = () => {
      const now = new Date();
      const next = getTimeOfDay(now);

      setTheme((prev) => (prev === next ? prev : next));
      applyToDocument(next, getSurface(next));

      timeoutId = setTimeout(sync, msUntilNextBoundary(now));
    };

    sync();
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const value = useMemo<TimeOfDayContextValue>(
    () => ({ theme, surface: getSurface(theme), label: getTimeOfDayLabelUk(theme) }),
    [theme],
  );

  return <TimeOfDayContext.Provider value={value}>{children}</TimeOfDayContext.Provider>;
}
