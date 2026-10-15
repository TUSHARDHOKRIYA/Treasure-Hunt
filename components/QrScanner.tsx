"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Keyboard, X } from "lucide-react";

/** Fullscreen camera scanner. Calls onCode once per detected code. */
export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [text, setText] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (manual) return;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;
    handled.current = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode("qr-reader", { verbose: false });
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 }) },
          (decoded) => {
            if (handled.current) return;
            handled.current = true;
            navigator.vibrate?.(40);
            onCode(decoded);
          },
          () => {},
        );
      } catch (e) {
        setError(
          String(e).includes("NotAllowed")
            ? "Camera permission was denied. Allow camera access in your browser settings, or enter the code manually."
            : "Couldn't open the camera. You can enter the code printed under the QR instead.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, [manual, onCode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="text-lg font-semibold">Scan the track QR</h2>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Close scanner">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!manual ? (
        <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-ink-900">
          <div id="qr-reader" className="absolute inset-0" />
          {!error && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative aspect-square w-[70%] max-w-sm">
                {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"].map((c) => (
                  <span key={c} className={`absolute h-10 w-10 border-gold-400 ${c}`} />
                ))}
                <span className="absolute left-3 right-3 h-0.5 animate-scanline rounded-full bg-gold-400 shadow-[0_0_16px_4px_rgba(255,209,102,.6)]" />
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              <div>
                <CameraOff className="mx-auto mb-4 h-12 w-12 text-ink-400" />
                <p className="text-ink-300">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form
          className="mx-4 flex flex-1 flex-col justify-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onCode(text.trim());
          }}
        >
          <label className="label" htmlFor="manual-code">Code printed below the QR</label>
          <input id="manual-code" className="input text-center font-mono lowercase tracking-widest" value={text} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="off" autoComplete="off" />
          <button className="btn-primary" type="submit">Submit code</button>
        </form>
      )}

      <div className="safe-bottom p-4">
        <button onClick={() => setManual((m) => !m)} className="btn-ghost">
          <Keyboard className="h-5 w-5" />
          {manual ? "Use camera instead" : "Enter code manually"}
        </button>
      </div>
    </div>
  );
}
