"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn-primary h-12" onClick={() => window.print()}>
      <Printer className="h-5 w-5" /> Print posters
    </button>
  );
}
