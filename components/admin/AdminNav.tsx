"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, QrCode, Settings2, Trophy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { adminLogout } from "@/app/admin/actions";

const LINKS = [
  { href: "/admin", label: "Live", Icon: LayoutDashboard },
  { href: "/admin/leaderboard", label: "Leaderboard", Icon: Trophy },
  { href: "/admin/qr", label: "QR codes", Icon: QrCode },
  { href: "/admin/setup", label: "Setup", Icon: Settings2 },
];

export function AdminNav({ eventOpen }: { eventOpen: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/teams") : path.startsWith(href));

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-ink-800 bg-ink-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo size={30} />
          <span className="font-semibold">Control room</span>
          <span
            className={`ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              eventOpen ? "bg-good/15 text-good" : "bg-ink-800 text-ink-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${eventOpen ? "animate-pulse bg-good" : "bg-ink-500"}`} />
            {eventOpen ? "Live" : "Closed"}
          </span>
          <nav className="ml-auto hidden gap-1 md:flex">
            {LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active(href) ? "bg-ink-800 text-gold-300" : "text-ink-300 hover:bg-ink-850"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <form action={adminLogout} className="ml-auto md:ml-2">
            <button className="grid h-10 w-10 place-items-center rounded-full text-ink-400 hover:bg-ink-800" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Bottom tab bar on phones */}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-800 bg-ink-950/90 pt-2 backdrop-blur-xl md:hidden">
        {LINKS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium ${active(href) ? "text-gold-300" : "text-ink-400"}`}>
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
