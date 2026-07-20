"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Settings } from "lucide-react";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { NAV_ITEMS } from "./nav-items";
import { Wordmark } from "./Wordmark";

interface DrawerProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

// UI Specification §5 Drawer + UX Specification §2.1/§2.6: off-canvas
// sidebar-drawer, same pattern on mobile and desktop, opened via the
// TopBar hamburger. The desktop collapse-to-icon-rail behavior below is
// a direct product request, not yet in either spec doc — mobile
// deliberately stays a true off-canvas overlay (closed by default, no
// permanent icon rail): on a phone-width viewport a persistent rail
// permanently costs real content width for a benefit UX Spec §2.1
// already treats as an accepted trade-off (opening the drawer costs
// "two actions", mitigated by keeping FAB independent of it). The
// collapse rail earns its keep on wider viewports, where reclaiming
// width while keeping nav visible is actually meaningful.
export function Drawer({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapsed,
}: DrawerProps) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <>
      {/* Backdrop-scrim — mobile only (§5 Drawer) */}
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={[
          "fixed inset-0 z-30 bg-black/35 transition-opacity duration-[250ms] ease-in-out motion-reduce:transition-none lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <div
        role="dialog"
        style={{ backdropFilter: "blur(28px)" }}
        aria-modal={isMobileOpen || undefined}
        aria-label="Навігація"
        className={[
          "bg-surface-drawer border-surface-drawer-border text-surface-text",
          "fixed inset-y-0 left-0 z-40 flex w-[68%] max-w-xs flex-col border-r p-4",
          "transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0 lg:transition-[width]",
          isCollapsed ? "lg:w-[76px] lg:max-w-none" : "lg:w-60 lg:max-w-none",
        ].join(" ")}
      >
        {/* Collapse/expand toggle — desktop only, no spec-mandated look,
            kept small and "floating" on the border edge as requested. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={
            isCollapsed ? "Розгорнути навігацію" : "Згорнути навігацію"
          }
          className="bg-surface-card border-surface-card-border shadow-glow hover:bg-surface-secondary-btn absolute top-11 -right-3 hidden h-6 w-6 items-center justify-center rounded-full border transition-colors lg:flex"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div
          className={["mb-[22px] px-2", isCollapsed ? "lg:px-0" : ""].join(" ")}
        >
          <Wordmark size="sm" collapsed={isCollapsed} />
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={[
                  "flex items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] font-semibold",
                  isCollapsed ? "lg:justify-center lg:px-0" : "",
                  isActive
                    ? "bg-brand-accent/[0.18] text-brand-accent"
                    : "hover:bg-surface-secondary-btn",
                ].join(" ")}
              >
                <Icon size={20} className="shrink-0" />
                <span
                  className={[
                    "whitespace-nowrap",
                    isCollapsed ? "lg:hidden" : "",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="bg-surface-divider my-1.5 h-px shrink-0" />

        {/* No settings page yet — inert for now, kept visible per spec's
            drawer footer anatomy. */}
        {/* <button
          type="button"
          disabled
          title={isCollapsed ? "Налаштування" : undefined}
          className={[
            "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold opacity-55",
            isCollapsed ? "lg:justify-center lg:px-0" : "",
          ].join(" ")}
        >
          <Settings size={18} className="shrink-0" />
          <span className={isCollapsed ? "lg:hidden" : ""}>Налаштування</span>
        </button> */}

        <button
          type="button"
          onClick={logout}
          title={isCollapsed ? "Вийти" : undefined}
          className={[
            "hover:bg-surface-secondary-btn flex items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2 text-xs font-semibold opacity-55 transition-colors hover:opacity-100",
            isCollapsed ? "lg:justify-center lg:px-0" : "",
          ].join(" ")}
        >
          <LogOut size={18} className="shrink-0" />
          <span
            className={[
              "whitespace-nowrap",
              isCollapsed ? "lg:hidden" : "",
            ].join(" ")}
          >
            Вийти
          </span>
        </button>
      </div>
    </>
  );
}
