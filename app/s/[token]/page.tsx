import { redirect } from "next/navigation";
import { getTeamId } from "@/lib/auth";
import { ScanLanding } from "./ScanLanding";

export const dynamic = "force-dynamic";

/** Landing page when a QR is scanned with the phone's normal camera app. */
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await getTeamId())) redirect(`/login?next=${encodeURIComponent(`/s/${token}`)}`);
  return <ScanLanding token={token} />;
}
