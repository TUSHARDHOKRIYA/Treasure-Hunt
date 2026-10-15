"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { resetPassword } from "@/app/admin/actions";

export function ResetPasswordButton({ teamId }: { teamId: number }) {
  const [pw, setPw] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        className="btn-ghost h-11 text-sm"
        disabled={pending}
        onClick={() => confirm("Generate a new password? The old one stops working for new sign-ins.") && start(async () => setPw(await resetPassword(teamId)))}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="h-4 w-4" /> New password</>}
      </button>
      {pw && (
        <p className="mt-2 rounded-xl bg-gold-400/10 px-3 py-2 text-center text-sm text-gold-300">
          New password: <b className="font-mono text-base">{pw}</b>
        </p>
      )}
    </div>
  );
}
