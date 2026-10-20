"use client";

import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { adminLogin } from "../actions";
import { Logo } from "@/components/Logo";

export default function AdminLoginPage() {
  const [error, action, pending] = useActionState(adminLogin, null);
  return (
    <main className="bg-hunt flex min-h-dvh items-center justify-center px-5">
      <form action={action} className="card w-full max-w-sm space-y-5 p-6">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Organisers</p>
            <h1 className="text-xl font-bold">Control room</h1>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </div>
        {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
        <button className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-5 w-5" /> Sign in</>}
        </button>
      </form>
    </main>
  );
}
