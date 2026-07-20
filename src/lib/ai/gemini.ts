import { ApiError, GoogleGenAI, Type } from "@google/genai";
import { systemPromptV1 } from "./prompts";

// Fixed model version for predictable behavior and low-latency
// structured extraction.
const MODEL = "gemini-3.1-flash-lite";
const TIMEOUT_MS = 20_000;

// Distinguishes failure modes so the Route Handler can map each to the
// correct error code (Architecture.md §Мапінг помилок).
export class GeminiRateLimitError extends Error {}
export class GeminiProviderError extends Error {}
export class GeminiUnavailableError extends Error {}

// ApiError means Gemini returned an HTTP response (a real status code) —
// anything else (timeout, network failure) never got a response at all.
function toGeminiError(
  error: unknown,
): GeminiRateLimitError | GeminiProviderError | GeminiUnavailableError {
  if (
    error instanceof GeminiRateLimitError ||
    error instanceof GeminiProviderError ||
    error instanceof GeminiUnavailableError
  ) {
    return error;
  }

  if (error instanceof ApiError) {
    return error.status === 429
      ? new GeminiRateLimitError(error.message)
      : new GeminiProviderError(error.message);
  }

  return new GeminiUnavailableError(error instanceof Error ? error.message : String(error));
}

function getGeminiEnv() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  return { apiKey };
}

// Hand-written to match aiResponseSchema (features/brain-dump/schema.ts).
// Not derived from the Zod schema — Zod remains the runtime source of truth
// and every response is re-validated against it after this call returns.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING, nullable: true },
          priority: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            nullable: true,
          },
          duration_minutes: {
            type: Type.INTEGER,
            nullable: true,
          },
          scheduled_date: {
            type: Type.STRING,
          },
          scheduled_time: {
            type: Type.STRING,
            nullable: true,
          },
        },
        required: [
          "title",
          "description",
          "priority",
          "duration_minutes",
          "scheduled_date",
          "scheduled_time",
        ],
      },
    },
    no_tasks_reason: {
      type: Type.STRING,
      nullable: true,
    },
  },
  required: ["tasks", "no_tasks_reason"],
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("GEMINI_TIMEOUT"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function generateTasksFromText(
  rawText: string,
  todayIsoDate: string,
): Promise<string> {
  const { apiKey } = getGeminiEnv();
  const ai = new GoogleGenAI({ apiKey });

  const callOnce = async (): Promise<string> => {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: `Сьогоднішня дата: ${todayIsoDate}.\n\nТекст користувача:\n${rawText}`,
        config: {
          systemInstruction: systemPromptV1,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
      TIMEOUT_MS,
    );

    if (!response.text) {
      throw new GeminiProviderError("Gemini returned an empty response.");
    }

    return response.text;
  };

  try {
    return await callOnce();
  } catch (error) {
    const classified = toGeminiError(error);

    // Retry once, only when Gemini never returned a response at all
    // (timeout/network) — never for rate limits or provider errors
    // (Architecture.md §Виклик Gemini).
    if (!(classified instanceof GeminiUnavailableError)) {
      throw classified;
    }

    try {
      return await callOnce();
    } catch (retryError) {
      throw toGeminiError(retryError);
    }
  }
}