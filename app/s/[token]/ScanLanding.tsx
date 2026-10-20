"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ScanResponse } from "@/lib/game";
import { ScanResultView } from "@/components/ScanResultView";
import { postJson } from "@/lib/client-fetch";
import { Logo } from "@/components/Logo";

export function ScanLanding({ token }: { token: string }) {
  const [result, setResult] = useState<ScanResponse | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    postJson("/api/scan", { code: token })
      .then((r) => (r?.ok ? r.json() : { result: "NETWORK" }))
      .catch(() => ({ result: "NETWORK" }))
      .then((d: ScanResponse) => {
        navigator.vibrate?.(d.result === "OK" ? 60 : [30, 50, 30]);
        setResult(d);
      });
  }, [token]);

  const ok = result?.result === "OK" || result?.result === "ALREADY_IN";

  return (
    <main className="bg-hunt flex min-h-dvh flex-col items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={48} />
        </div>
        <div className="card p-7">
          {!result ? (
            <div className="flex flex-col items-center py-10 text-ink-300">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-gold-400" />
              Checking QR code…
            </div>
          ) : (
            <>
              <ScanResultView result={result} />
              <Link href="/play" className={`${ok ? "btn-primary" : "btn-ghost"} mt-7`}>
                {ok ? "Start questions" : "Back to the hunt"} <ArrowRight className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
