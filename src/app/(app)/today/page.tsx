import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-4">{user.email}</p>
      <LogoutButton />
    </main>
  );
}
