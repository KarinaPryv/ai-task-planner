// No-flash boundary logic, deliberately duplicated from time-of-day.ts:
// this runs as a raw, unbundled <script> injected into <head> (see
// layout.tsx) so it executes before hydration and before first paint —
// it cannot import the TS module. Keep the boundary hours in sync with
// BOUNDARY_HOURS in time-of-day.ts if they ever change.
export const themeScript = `(function () {
  try {
    var hour = new Date().getHours();
    var theme = hour >= 5 && hour < 9 ? "morning"
      : hour >= 9 && hour < 17 ? "day"
      : hour >= 17 && hour < 21 ? "evening"
      : "night";
    var surface = theme === "night" ? "dark" : "light";
    var root = document.documentElement;
    root.setAttribute("data-time-theme", theme);
    root.setAttribute("data-surface", surface);
  } catch (e) {}
})();`;
