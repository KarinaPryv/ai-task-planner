import { NextResponse } from "next/server";

// Shared { data } / { error } envelope (API Contract, Architecture.md §API).
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}
