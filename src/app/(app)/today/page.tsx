import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/timezone";
import { getTodayTasks } from "@/features/tasks/api/queries";
import { TodayPlanList } from "@/features/tasks/components/TodayPlanList";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // No client-side timezone sync yet (Architecture.md §Timezone) — every
  // user reads as 'UTC', the column's default, until that sync exists.
  // getTodayTasks/getTodayInTimezone are already timezone-correct, so
  // nothing here needs to change once the sync is added.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const todayDate = getTodayInTimezone(settings?.timezone ?? "UTC");
  const tasks = await getTodayTasks(supabase, todayDate);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <TodayPlanList initialTasks={tasks} todayDate={todayDate} />
    </main>
  );
}
