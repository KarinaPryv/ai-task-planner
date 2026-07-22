"use client";

import { useEffect, useState } from "react";
import { BrainDumpComposer } from "@/features/brain-dump/components/BrainDumpComposer";
import { DraftReviewList } from "@/features/brain-dump/components/DraftReviewList";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePageBadge } from "@/components/ui/PageBadgeContext";
import { useDraftReview } from "@/features/brain-dump/hooks/useDraftReview";
import { useDraftText } from "@/features/brain-dump/hooks/useDraftText";
import type { BrainDumpResponse } from "@/features/brain-dump/types";
import type { Task } from "@/features/tasks/types";
import { createClient } from "@/lib/supabase/client";
import { getTodayInTimezone } from "@/lib/timezone";

// AI Processing (full-screen loading) is a separate, not-yet-designed
// state — this still just flips between "idle" and "loading" locally.
export default function BrainDumpPage() {
  const { text: rawText, setText: setRawText, clearDraft } = useDraftText();
  const { batches, addBatch, removeTasks, updateTask } = useDraftReview();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setCount } = usePageBadge();

  // Drawer's "Чернетки"/"Сьогодні" badges (UX Specification §2.3) — this
  // page doesn't own that data server-side the way /drafts and /today do,
  // so it publishes live counts itself: a baseline fetched once on mount
  // (everything that already existed before this Review session touched
  // anything) plus what happens during the session — batches growing/
  // shrinking for drafts, confirmed-today tasks for today.
  const [baselineDraftCount, setBaselineDraftCount] = useState<number | null>(null);
  const [baselineTodayCount, setBaselineTodayCount] = useState<number | null>(null);
  const [todayDate, setTodayDate] = useState<string | null>(null);
  const [confirmedTodayCount, setConfirmedTodayCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadBaseline() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle();

      const today = getTodayInTimezone(settings?.timezone ?? "UTC");

      const [draftResult, todayResult] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "confirmed")
          .eq("scheduled_date", today),
      ]);

      if (!cancelled) {
        setTodayDate(today);
        setBaselineDraftCount(draftResult.count ?? 0);
        setBaselineTodayCount(todayResult.count ?? 0);
      }
    }

    loadBaseline();

    return () => {
      cancelled = true;
    };
  }, []);

  const sessionDraftCount = batches.reduce((sum, batch) => sum + batch.tasks.length, 0);

  useEffect(() => {
    if (baselineDraftCount === null) return;

    setCount("/drafts", baselineDraftCount + sessionDraftCount);
    return () => setCount("/drafts", null);
  }, [baselineDraftCount, sessionDraftCount, setCount]);

  useEffect(() => {
    if (baselineTodayCount === null) return;

    setCount("/today", baselineTodayCount + confirmedTodayCount);
    return () => setCount("/today", null);
  }, [baselineTodayCount, confirmedTodayCount, setCount]);

  function handleTasksConfirmed(tasks: Task[]) {
    if (!todayDate) return;

    const confirmedToday = tasks.filter((task) => task.scheduled_date === todayDate).length;
    if (confirmedToday > 0) setConfirmedTodayCount((prev) => prev + confirmedToday);
  }

  async function handleSubmit() {
    if (!rawText.trim() || status === "loading") {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await fetch("/api/brain-dump", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ raw_text: rawText }),
      });

      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Сталася помилка.");
        setStatus("error");
        return;
      }

      addBatch(body.data as BrainDumpResponse);
      clearDraft();
      setRawText("");
      setStatus("idle");
    } catch {
      setErrorMessage("Не вдалося зв'язатися з сервером.");
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {batches.length > 0 ? (
        <DraftReviewList
          batches={batches}
          onTasksConfirmedOrDeleted={removeTasks}
          onTasksConfirmed={handleTasksConfirmed}
          onTaskUpdated={updateTask}
        />
      ) : (
        <EmptyState message="Тут з'являться твої чернетки задач після обробки" />
      )}

      {status === "error" && errorMessage && (
        <p className="text-destructive font-body px-4 pb-2 text-sm lg:px-10">{errorMessage}</p>
      )}

      <BrainDumpComposer
        value={rawText}
        onChange={setRawText}
        onSubmit={handleSubmit}
        loading={status === "loading"}
      />
    </main>
  );
}
