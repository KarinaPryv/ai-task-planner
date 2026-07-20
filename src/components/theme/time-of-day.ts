export const TIME_OF_DAY_VALUES = ["morning", "day", "evening", "night"] as const;
export type TimeOfDay = (typeof TIME_OF_DAY_VALUES)[number];
export type Surface = "light" | "dark";

const LABELS_UK: Record<TimeOfDay, string> = {
  morning: "ранок",
  day: "день",
  evening: "вечір",
  night: "ніч",
};

// Hour boundaries, in order (UI Specification §2 Кольори — Атмосферний
// фон): 05:00 morning, 09:00 day, 17:00 evening, 21:00 night (wraps past
// midnight back to morning at 05:00).
const BOUNDARY_HOURS = [5, 9, 17, 21] as const;

export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();

  if (hour >= 5 && hour < 9) return "morning";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

// morning/day/evening → light atmosphere → light surface; night → dark
// (UI Specification §5, Light/Dark Surface Adaptivity).
export function getSurface(theme: TimeOfDay): Surface {
  return theme === "night" ? "dark" : "light";
}

export function getTimeOfDayLabelUk(theme: TimeOfDay): string {
  return LABELS_UK[theme];
}

// ms until the next boundary crossing, so callers can schedule a single
// setTimeout instead of polling.
export function msUntilNextBoundary(date: Date): number {
  const currentHour = date.getHours();
  const nextHour = BOUNDARY_HOURS.find((hour) => hour > currentHour) ?? BOUNDARY_HOURS[0] + 24;

  const next = new Date(date);
  next.setHours(nextHour % 24, 0, 0, 0);

  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - date.getTime();
}
