"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shared by the Drawer footer "Вийти" item and the (currently standalone)
// today/logout-button.tsx.
export function useLogout() {
  const router = useRouter();

  return async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
}
