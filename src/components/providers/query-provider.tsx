"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Architecture.md reserves TanStack Query specifically for client-side
// mutations with optimistic updates (confirm/edit/delete in Draft Review,
// undo on delete) — reads still go directly through the Supabase SDK. One
// QueryClient per browser session, created lazily so it isn't shared
// across users/requests (Next.js App Router client component).
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
