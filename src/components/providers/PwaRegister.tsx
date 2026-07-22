"use client";

import { useEffect } from "react";

// Registers the no-op service worker (public/sw.js) so the app satisfies
// PWA installability criteria (Architecture.md §PWA). Production-only —
// a registered SW would otherwise sit between Turbopack's dev server and
// the browser, interfering with hot reload.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
