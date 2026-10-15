"use client";

import { useActionState, useRef } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";
import type { ImportResult } from "@/app/admin/actions";

export function ImportForm({
  action,
  confirmText,
  button,
}: {
  action: (prev: ImportResult, form: FormData) => Promise<ImportResult>;
  confirmText?: string;
  button: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  function download(csv: string) {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "credentials.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-ink-300 file:mr-3 file:rounded-xl file:border-0 file:bg-ink-800 file:px-4 file:py-2.5 file:font-semibold file:text-ink-100"
      />
      <button className="btn-primary h-12" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><FileUp className="h-5 w-5" /> {button}</>}
      </button>
      {result && (
        <div className={`rounded-xl px-4 py-3 text-sm ${result.ok ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
          {result.message}
          {result.credentialsCsv && (
            <button type="button" onClick={() => download(result.credentialsCsv!)} className="mt-2 flex items-center gap-2 font-semibold underline">
              <Download className="h-4 w-4" /> Download team passwords (credentials.csv)
            </button>
          )}
        </div>
      )}
    </form>
  );
}
