import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="bg-hunt flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Compass className="h-14 w-14 text-gold-400" />
      <h1 className="mt-5 text-3xl font-bold">Off the map</h1>
      <p className="mt-2 max-w-xs text-ink-300">This page doesn&apos;t exist. Head back and follow your clue.</p>
      <Link href="/" className="btn-primary mt-8 max-w-xs">
        Back to the hunt
      </Link>
    </main>
  );
}
