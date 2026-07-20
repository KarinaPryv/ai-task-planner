"use client";

import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

interface TopBarProps {
  isMobileOpen: boolean;
  onToggleMobile: () => void;
}

// UX Specification §2.1: persistent top bar (outside the drawer) —
// hamburger (left) + current screen name. The hamburger only toggles the
// mobile off-canvas drawer; on desktop the drawer is always at least an
// icon rail (never fully hidden), so Drawer's own border toggle takes
// over that job and the hamburger button hides at the lg breakpoint —
// the title stays visible on both.
export function TopBar({ isMobileOpen, onToggleMobile }: TopBarProps) {
  const pathname = usePathname();
  const title = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "AI Task Planner";

  return (
    <header className="border-surface-drawer-border text-surface-text flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label={isMobileOpen ? "Закрити навігацію" : "Відкрити навігацію"}
        aria-expanded={isMobileOpen}
        className="hover:bg-surface-secondary-btn flex h-8 w-8 items-center justify-center rounded-lg transition-colors lg:hidden"
      >
        {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <span className="font-body text-sm font-semibold">{title}</span>
    </header>
  );
}
