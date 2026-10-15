import { requireAdmin } from "@/lib/auth";
import { isEventOpen } from "@/lib/settings";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="bg-hunt min-h-dvh">
      <AdminNav eventOpen={await isEventOpen()} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-12">{children}</main>
    </div>
  );
}
