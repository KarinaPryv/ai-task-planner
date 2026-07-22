"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/ui/Wordmark";
import { GoogleButton } from "@/features/auth/components/GoogleButton";

// UI Specification §6 Auth — Google OAuth only for now (email+password
// deferred until implemented; PRD remains the source of truth for the
// eventual two-method scope). Layout/spacing/colors confirmed via Figma
// (node 8:88, file KJdzlOzt7AbKUXca1gmpDk): a plain centered column, no
// custom offset — AtmosphereBackground (mounted in the root layout)
// provides the background, this page renders no atmosphere logic itself.
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
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <Link href="/" className="mb-3.5">
        <Wordmark />
      </Link>
      <p className="text-body-sm text-surface-text-muted font-body mb-9">
        Плануй розумніше з AI
      </p>
      <GoogleButton onClick={handleGoogleLogin} />
    </main>
  );
}
