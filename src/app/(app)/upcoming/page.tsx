import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/timezone";
import { addDaysIso, mondayOfIso } from "@/lib/date";
import { getOverdueTasks, getUpcomingRangeTasks } from "@/features/upcoming/api/queries";
import { UpcomingBoard } from "@/features/upcoming/components/UpcomingBoard";

export default async function UpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const today = getTodayInTimezone(settings?.timezone ?? "UTC");
  const weekStart = mondayOfIso(today);
  const weekEnd = addDaysIso(weekStart, 6);

  const [rangeTasks, overdueTasks] = await Promise.all([
    getUpcomingRangeTasks(supabase, today, weekEnd),
    getOverdueTasks(supabase, today),
  ]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <UpcomingBoard
        today={today}
        initialWeekStart={weekStart}
        initialTasks={[...overdueTasks, ...rangeTasks]}
      />
    </main>
  );
}
