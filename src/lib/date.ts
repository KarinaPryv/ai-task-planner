// Local (wall-clock) ISO date parsing/formatting shared by every date
// picker and week-math helper — scheduled_date has no UTC/timezone
// attached (Architecture.md §Timezone), so this must never route through
// UTC-based Date parsing (`new Date("2026-07-21")` parses as UTC
// midnight, which shifts a day in negative-UTC-offset timezones).
export function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = parseLocalDate(isoDate);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

// Monday of the ISO (Mon-start) week containing isoDate — Upcoming's
// board is always pн–нд (UX Specification §10.1).
export function mondayOfIso(isoDate: string): string {
  const date = parseLocalDate(isoDate);
  const isoDayOfWeek = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6

  return addDaysIso(isoDate, -isoDayOfWeek);
}

function shortMonth(date: Date): string {
  return date.toLocaleDateString("uk-UA", { month: "short" }).replace(".", "");
}

// How many weeks forward selectedIso's week is from currentWeekMondayIso's
// week — used by Upcoming's date picker (§10.2) to jump straight to the
// week containing a picked date. Clamped to 0 since only today/future
// dates are selectable in that picker (the current week is always index 0).
export function weekIndexForDate(selectedIso: string, currentWeekMondayIso: string): number {
  const targetMonday = parseLocalDate(mondayOfIso(selectedIso));
  const currentMonday = parseLocalDate(currentWeekMondayIso);
  const diffDays = Math.round((targetMonday.getTime() - currentMonday.getTime()) / 86_400_000);

  return Math.max(0, Math.round(diffDays / 7));
}

// Upcoming top bar range label — "21–26 лип" within one month, "30 черв
// – 5 лип" across a month boundary (UX Specification §10.2 mockup).
export function formatWeekRangeLabel(startIso: string, endIso: string): string {
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${shortMonth(end)}`;
  }

  return `${start.getDate()} ${shortMonth(start)} – ${end.getDate()} ${shortMonth(end)}`;
}
