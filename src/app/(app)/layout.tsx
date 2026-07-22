"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { TopBar } from "@/components/ui/TopBar";
import { PageBadgeProvider } from "@/components/ui/PageBadgeContext";
import { useTimezoneSync } from "@/features/auth/hooks/useTimezoneSync";

const COLLAPSE_STORAGE_KEY = "drawer-collapsed";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);

  useTimezoneSync();

  // localStorage isn't available during SSR, so the value can only be
  // known after mount — both server and the initial client render must
  // agree on the `false` default above to avoid a hydration mismatch
  // (the lesson from TimeOfDayProvider's data-time-theme). Desktop
  // collapse state is a user preference, not part of the visual identity
  // like the time-of-day theme, so a brief post-mount flash is an
  // acceptable trade-off against adding a second no-flash blocking
  // script for it.
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);

    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads an external system (localStorage) on mount
      setCollapsed(stored === "true");
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;

      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <PageBadgeProvider>
      <div className="flex min-h-0 flex-1">
        <Drawer
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
          <TopBar isMobileOpen={isMobileOpen} onToggleMobile={() => setMobileOpen((v) => !v)} />
          {children}
        </div>
      </div>
    </PageBadgeProvider>
  );
}
