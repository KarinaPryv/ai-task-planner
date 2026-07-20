"use client";

import { useState } from "react";

// Increment 5 smoke test only: no persistence, no idempotency, no RPC, no
// warnings, no design. Full Brain Dump / Review UI arrives once Increment 7
// wires this up to real Idempotency-Key + RPC persistence (Increment 6).
export default function BrainDumpPage() {
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function handleSubmit() {
    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

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

      setResult(body.data);
      setStatus("idle");
    } catch {
      setErrorMessage("Не вдалося зв'язатися з сервером.");
      setStatus("error");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Brain Dump</h1>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={6}
        className="w-full max-w-xl border p-2"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={rawText.trim().length === 0 || status === "loading"}
        className="w-fit rounded-md border px-4 py-2"
      >
        {status === "loading" ? "Обробка..." : "Далі"}
      </button>

      {status === "error" && <p>{errorMessage}</p>}

      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
