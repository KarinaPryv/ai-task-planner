"use client";

import { usePathname } from "next/navigation";

// Fixed, full-viewport "living atmosphere" layer (UI Specification §1) —
// mounted once in the root layout, behind all page content. Renders the
// radial gradient defined by .atmosphere-layer (styles/time-of-day.css),
// which reads its color stops from the --atmosphere-1..4 variables that
// [data-time-theme] sets on <html>. Purely presentational: this
// component has no theme logic of its own, it only consumes the CSS
// variables — that's what keeps theme switching from duplicating styles
// per screen.
//
// The landing page ("/") is the one deliberate exception — it has a
// single fixed theme, not a time-of-day one, and supplies its own local
// atmosphere layer scoped to a fixed [data-time-theme]/[data-surface]
// wrapper instead of this global (real-time-driven) one.
export function AtmosphereBackground() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <div
      aria-hidden="true"
      className="atmosphere-layer pointer-events-none fixed inset-0 -z-10"
    />
  );
}
