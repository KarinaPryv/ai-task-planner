"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type BadgeCounts = Partial<Record<string, number>>;

interface PageBadgeContextValue {
  counts: BadgeCounts;
  setCount: (href: string, count: number | null) => void;
}

const PageBadgeContext = createContext<PageBadgeContextValue | null>(null);

// Lets a page (Drafts, Today's Plan) publish its own live task count,
// keyed by route — consumed by TopBar's title badge (Drafts only, UX
// Specification §2.3) and by Drawer's nav-item badges, as the exact,
// optimistic-update-aware count while that page is mounted. Nothing else
// needs to know about any individual page's data this way.
export function PageBadgeProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<BadgeCounts>({});

  // useCallback (stable reference) + bailing out when nothing actually
  // changes (returning the same object from a setState updater skips the
  // re-render) matter here, not just as micro-optimizations: every
  // consumer effect that publishes a count depends on this function —
  // an unstable reference would re-fire those effects every render,
  // which re-call setCount, which re-renders the provider, forever.
  const setCount = useCallback((href: string, count: number | null) => {
    setCounts((prev) => {
      if (count === null) {
        if (!(href in prev)) return prev;
        const next = { ...prev };
        delete next[href];
        return next;
      }

      if (prev[href] === count) return prev;
      return { ...prev, [href]: count };
    });
  }, []);

  const value = useMemo(() => ({ counts, setCount }), [counts, setCount]);

  return <PageBadgeContext.Provider value={value}>{children}</PageBadgeContext.Provider>;
}

export function usePageBadge() {
  const ctx = useContext(PageBadgeContext);

  if (!ctx) {
    throw new Error("usePageBadge must be used within PageBadgeProvider");
  }

  return ctx;
}
