import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDraftTasks } from "@/features/tasks/api/queries";
import { DraftsList } from "@/features/tasks/components/DraftsList";

export default async function DraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tasks = await getDraftTasks(supabase);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <DraftsList initialTasks={tasks} />
    </main>
  );
}
