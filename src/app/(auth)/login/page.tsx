"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">Login</h1>
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="mt-6 rounded-md border px-4 py-2"
      >
        Увійти через Google
      </button>
    </main>
  );
}
