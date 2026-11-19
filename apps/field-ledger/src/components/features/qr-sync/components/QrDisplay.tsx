
interface QrDisplayProps {
  qr: {
    svg: string;
    payload: string;
    index: number;
    total: number;
    bytes: number;
    eventCount: number;
  };
}

export default function QrDisplay({ qr }: QrDisplayProps) {
  const imageSrc =
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--text)]">
            Transfer QR
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Scan this code using another FieldLedger device.
          </p>
        </div>

        <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
          QR {qr.index + 1} of {qr.total}
        </span>
      </div>

      <div className="flex justify-center rounded-xl bg-white p-4">
        <img
          src={imageSrc}
          alt="CarrySync transfer QR"
          className="h-64 w-64 max-w-full object-contain"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span>{qr.eventCount} movements</span>
        <span>{qr.bytes} bytes</span>
      </div>

      <div className="mt-5">
        <label
          htmlFor="qr-payload"
          className="mb-2 block text-sm font-semibold text-[var(--text)]"
        >
          Manual transfer payload
        </label>

        <textarea
          id="qr-payload"
          aria-label="QR payload"
          readOnly
          value={qr.payload}
          rows={4}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-blue-500"
        />

        <p className="mt-2 text-xs text-[var(--muted)]">
          You can copy this text and paste it into the receiving device if
          camera scanning is unavailable.
        </p>
      </div>
    </section>
  );
}
