import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/timezone";
import { getTodayTasks } from "@/features/tasks/api/queries";
import { AtmosphereShowcase } from "@/features/landing/components/AtmosphereShowcase";
import { Logo } from "@/components/ui/Logo";

// Root route: public landing page for signed-out visitors. Fixed light
// "paper" look (#FBF9F6/#211C2E/#746C82) — deliberately not built from
// the app's own [data-surface]/[data-time-theme] tokens, since those are
// meant to "see through" the live atmosphere and this page has none of
// its own (AtmosphereBackground skips rendering on "/" — see that
// component). The only place the real day/night theming appears is the
// self-contained AtmosphereShowcase demo below.
//
// Signed-in visitors never see this content — they're redirected
// straight to whichever screen is actually useful right now: Today's
// Plan if today already has something on it, Brain Dump otherwise (an
// empty Today's Plan is a dead end; Brain Dump is the actual next
// action).
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    const today = getTodayInTimezone(settings?.timezone ?? "UTC");
    const todayTasks = await getTodayTasks(supabase, today);

    redirect(todayTasks.length > 0 ? "/today" : "/brain-dump");
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#FBF9F6]">
      <LandingHeader />
      <LandingHero />
      <AtmosphereSection />
      <HowItWorksSection />
      <LandingFooter />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-[rgba(251,249,246,0.72)] px-5 py-5 backdrop-blur-md lg:px-14 lg:py-6.5">
      <div className="flex items-center gap-[9px]">
        <Logo size={32} />
        <span className="font-accent text-brand leading-tight font-bold text-[#211C2E]">AI Task Planner</span>
      </div>

      <Link
        href="/login"
        className="font-body rounded-full border-[1.5px] border-[rgba(33,28,46,0.16)] px-5 py-2 text-[13px] font-bold text-[#211C2E] transition-colors hover:border-[rgba(33,28,46,0.32)] hover:bg-black/[0.03]"
      >
        Увійти
      </Link>
    </header>
  );
}

function LandingHero() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 py-14 text-center lg:gap-6 lg:px-14">
      <h1 className="font-accent max-w-[300px] text-[32px] leading-[1.2] font-bold text-[#211C2E] sm:max-w-[440px] sm:text-[40px] lg:max-w-[780px] lg:text-[52px] lg:leading-[1.18]">
        Розвантаж голову.
        <br />
        Ми складемо <span className="text-brand-accent">план дня</span>.
      </h1>

      <p className="font-body max-w-[300px] text-[15px] leading-relaxed font-medium text-[#746C82] sm:max-w-[420px] sm:text-[16px] lg:max-w-[480px] lg:text-[18px] lg:leading-[1.6]">
        Скажи чи напиши все, що крутиться в голові — застосунок сам перетворить це на задачі з часом,
        пріоритетом і датою.
      </p>

      <Link
        href="/login"
        className="font-accent mt-1 rounded-full bg-brand-accent px-8 py-4 text-[14px] font-bold text-white shadow-[0_10px_26px_rgba(255,107,71,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0 lg:px-9 lg:py-[15px] lg:text-[15px]"
      >
        Почати →
      </Link>

      <p className="font-body text-[11.5px] text-[#746C82] opacity-75">Без картки. 30 секунд на реєстрацію.</p>
    </section>
  );
}

function AtmosphereSection() {
  return (
    <section className="flex flex-col items-center gap-8 border-t border-[rgba(33,28,46,0.08)] px-5 py-16 lg:gap-9 lg:px-14 lg:py-24">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-accent text-[22px] font-bold text-[#211C2E] lg:text-[30px]">
          Один застосунок. Чотири настрої дня.
        </h2>
        <p className="font-body max-w-[300px] text-[13.5px] text-[#746C82] sm:max-w-[420px] lg:text-[15px]">
          Інтерфейс тихо змінюється разом із часом доби — не просто темна тема, а справжня атмосфера.
        </p>
      </div>

      <AtmosphereShowcase />
    </section>
  );
}

interface HowItWorksStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Скинь усе, що в голові",
    description: "Текстом чи голосом — без структури, без форматування, просто потік думок.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    title: "ШІ розкладає на задачі",
    description: "Час, тривалість, пріоритет — визначаються самі, ти лише підтверджуєш.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.6 4.8L18 9l-4.4 1.2L12 15l-1.6-4.8L6 9l4.4-1.2z" />
        <circle cx="19" cy="18" r="1.6" />
        <circle cx="5" cy="5" r="1.2" />
      </svg>
    ),
  },
  {
    title: "Готовий план дня",
    description: "Реалістичний, без перевантаження — і завжди під рукою.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 15l2.5 2.5L16 12" />
      </svg>
    ),
  },
];

function HowItWorksSection() {
  return (
    <section className="flex flex-col items-center gap-10 border-t border-[rgba(33,28,46,0.08)] px-5 py-16 lg:gap-12 lg:px-14 lg:py-24">
      <h2 className="font-accent text-center text-[22px] font-bold text-[#211C2E] lg:text-[30px]">
        Як це працює
      </h2>

      <div className="flex w-full max-w-[900px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <Fragment key={step.title}>
            <div className="flex w-[240px] flex-col items-center gap-3 text-center lg:max-w-[220px]">
              <div className="text-brand-accent h-12 w-12 lg:h-14 lg:w-14">{step.icon}</div>
              <h3 className="font-body text-[14px] font-bold text-[#211C2E] lg:text-[15px]">{step.title}</h3>
              <p className="font-body text-[12.5px] leading-relaxed text-[#746C82] lg:text-[13px]">
                {step.description}
              </p>
            </div>

            {index < HOW_IT_WORKS_STEPS.length - 1 && (
              <span aria-hidden="true" className="text-[20px] text-[#211C2E]/20">
                <span className="lg:hidden">↓</span>
                <span className="hidden lg:inline">→</span>
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="flex flex-col items-center gap-4 border-t border-[rgba(33,28,46,0.08)] px-5 py-12 text-center lg:gap-5 lg:py-16">
      <Link
        href="/login"
        className="font-accent rounded-full bg-brand-accent px-7 py-3.5 text-[13px] font-bold text-white shadow-[0_10px_26px_rgba(255,107,71,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0 lg:text-[14px]"
      >
        Почати →
      </Link>
      <p className="font-body text-[11px] text-[#746C82] opacity-70">
        © {new Date().getFullYear()} · Зроблено для тих, у кого забагато думок
      </p>
    </footer>
  );
}
