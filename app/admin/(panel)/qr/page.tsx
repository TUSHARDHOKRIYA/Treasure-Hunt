import QRCode from "qrcode";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { PrintButton } from "@/components/admin/PrintButton";

export default async function QrPage() {
  const qrs = await db.qrCode.findMany({ include: { track: true }, orderBy: [{ trackId: "asc" }, { station: "asc" }] });
  const items = await Promise.all(
    qrs.map(async (q) => {
      const url = `${config.publicBaseUrl}/s/${q.token}`;
      return { ...q, url, svg: await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) };
    }),
  );

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Print & place</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">QR stations</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-400">
            12 posters — 3 stations per track. Each prints on its own page. Codes point to <span className="font-mono text-ink-300">{config.publicBaseUrl}</span>{" "}
            (set <span className="font-mono">PUBLIC_BASE_URL</span> to your live URL before printing).
          </p>
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <PrintButton />
          <a href="/admin/test-kit" className="btn-ghost h-12 text-sm">
            Test kit
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:block">
        {items.map((q) => (
          <article
            key={q.id}
            className="card flex flex-col items-center p-6 text-center print:mb-0 print:flex print:h-screen print:break-after-page print:justify-center print:rounded-none print:border-0 print:bg-white print:text-black"
          >
            <p className="text-xs font-bold uppercase tracking-[.25em]" style={{ color: q.track.color }}>
              Track {q.trackId}
            </p>
            <h2 className="mt-1 text-2xl font-bold print:text-5xl">{q.track.name}</h2>
            <div className="my-5 w-full max-w-[240px] rounded-2xl bg-white p-3 print:max-w-[420px]" dangerouslySetInnerHTML={{ __html: q.svg }} />
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl font-mono text-2xl font-bold text-ink-950 print:h-20 print:w-20 print:text-5xl" style={{ background: q.track.color }}>
                {q.station}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold">Station {q.station}</p>
                <p className="font-mono text-xs text-ink-400 print:text-base print:text-gray-600">code: {q.token}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
