// Today's Plan / Calendar "what is today" (Architecture.md §Timezone).
// user_settings.timezone drives this once session-start sync exists; until
// then every user is 'UTC' (the column's default), which this function
// already handles correctly — no separate code path needed later.
export function getTodayInTimezone(timezone: string): string {
  try {
    // en-CA formats as YYYY-MM-DD, matching the `date` column's ISO format.
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date());
  }
}
