"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Users } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, password }),
    }).catch(() => null);
    if (res?.ok) {
      router.replace(next && next.startsWith("/") ? next : "/play");
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Network error. Check your connection and try again.");
    setShakeKey((k) => k + 1);
    navigator.vibrate?.([30, 40, 30]);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <div>
        <label className="label" htmlFor="code">Team code</label>
        <div className="relative">
          <Users className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" />
          <input
            id="code"
            className="input pl-12 font-mono uppercase tracking-widest"
            placeholder="TEAM07"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="username"
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" />
          <input
            id="password"
            className="input px-12"
            type={show ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-ink-400"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error && (
        <p key={shakeKey} className="animate-shake rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Begin the hunt <ArrowRight className="h-5 w-5" /></>}
      </button>
    </form>
  );
}
