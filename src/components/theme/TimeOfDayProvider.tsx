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

  // Android/Chrome has no equivalent to iOS's translucent status bar for
  // installed web apps — it always paints a flat, opaque bar in
  // theme-color. The closest a flat bar can get to matching the
  // atmosphere gradient beneath it is tracking that gradient's own
  // top-most stop, so the seam reads as "part of the atmosphere" instead
  // of a fixed neutral. Read via getComputedStyle (not duplicated here)
  // so this can never drift from styles/time-of-day.css.
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const computed = getComputedStyle(document.documentElement);
  const topColor = computed.getPropertyValue("--atmosphere-1").trim();
  const bottomColor = computed.getPropertyValue("--atmosphere-4").trim();

  if (themeColorMeta && topColor) {
    themeColorMeta.setAttribute("content", topColor);
  }

  // iOS standalone PWAs paint the bottom safe-area strip (home indicator
  // area) from <body>'s own background-color, not from AtmosphereBackground
  // (a z-indexed fixed child) — even with viewport-fit: cover, that layer
  // doesn't reach it. body has no background of its own otherwise, so it
  // falls back to the browser default (white) there. Tracking the
  // gradient's bottom-most stop keeps that strip part of the atmosphere
  // instead of a stray white bar.
  if (bottomColor) {
    document.body.style.backgroundColor = bottomColor;
  }
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
