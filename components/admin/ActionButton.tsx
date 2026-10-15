"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

export function ActionButton({
  action,
  confirmText,
  className = "btn-ghost",
  children,
}: {
  action: () => Promise<unknown>;
  confirmText?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          await action();
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
