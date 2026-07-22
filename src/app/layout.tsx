import type { Metadata } from "next";
import { Comfortaa, Manrope } from "next/font/google";
import "./globals.css";
import { AtmosphereBackground } from "@/components/theme/AtmosphereBackground";
import { TimeOfDayProvider } from "@/components/theme/TimeOfDayProvider";
import { themeScript } from "@/components/theme/theme-script";
import { QueryProvider } from "@/components/providers/query-provider";

// UI Specification §2 Типографіка: Comfortaa is the accent typeface
// (buttons, badges, wordmark, FAB — never card titles/body text);
// Manrope is the neutral typeface (everything else). Both need full
// Cyrillic support.
const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin", "cyrillic"],
  weight: ["700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Yasno",
  description: "Yasno",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${comfortaa.variable} ${manrope.variable} h-full antialiased`}
      // data-time-theme/data-surface are set by the no-flash inline
      // script below (before hydration) and kept in sync by
      // TimeOfDayProvider afterwards — React never renders them itself,
      // so it has nothing correct to reconcile them against.
      suppressHydrationWarning
    >
      <head>
        {/* No-flash time-of-day theme: must run before hydration/paint,
            so it's a raw script, not a React effect (see theme-script.ts). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex h-full flex-col overflow-hidden">
        <QueryProvider>
          <TimeOfDayProvider>
            <AtmosphereBackground />
            {children}
          </TimeOfDayProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
