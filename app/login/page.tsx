import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";
import { getTimerStart } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const timerStart = await getTimerStart();
  return (
    <main className="bg-hunt flex min-h-dvh flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="animate-rise flex flex-col items-center pt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-gold-500/30 blur-2xl" />
            <Logo size={84} />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.3em] text-gold-400">Treasure Hunt</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">The Hunt Begins</h1>
          <p className="mt-3 max-w-xs text-ink-300">Four arenas. Sixteen questions. One clock. Sign in with your team credentials.</p>
        </div>

        <div className="animate-rise mt-10 [animation-delay:.1s]">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="safe-bottom mt-auto pt-10 text-center text-xs text-ink-500">
          {timerStart === "login"
            ? "Your clock starts the moment you sign in."
            : "Signing in is safe — your clock starts only when a volunteer confirms your attendance."}{" "}
          Keep this device with your team.
        </p>
      </div>
    </main>
  );
}
