import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

const PROTECTED_PATHS = ["/", "/today", "/calendar", "/drafts", "/brain-dump"];
const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  function redirectWithSessionCookies(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && PROTECTED_PATHS.includes(pathname)) {
    return redirectWithSessionCookies("/login");
  }

  if (user && AUTH_PATHS.includes(pathname)) {
    return redirectWithSessionCookies("/");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
