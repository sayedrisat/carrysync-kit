
interface ImportReviewProps {
  preview: {
    newEvents: unknown[];
    duplicateEvents: unknown[];
    conflicts: { eventId: string }[];
    canImport: boolean;
    impact: {
      productKey: string;
      label: string;
      delta: number;
      balanceBefore: number;
      balanceAfter: number;
      warning?: string;
    }[];
  };
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}

export default function ImportReview({
  preview,
  onConfirm,
  onCancel,
  importing,
}: ImportReviewProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="text-lg font-bold text-[var(--text)]">
        Import review
      </h3>

      <p className="mt-1 text-sm text-[var(--muted)]">
        Review these changes before importing them into your inventory.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[var(--background)] p-4">
          <p className="text-sm text-[var(--muted)]">New movements</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {preview.newEvents.length}
          </p>
        </div>

        <div className="rounded-xl bg-[var(--background)] p-4">
          <p className="text-sm text-[var(--muted)]">Duplicates</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {preview.duplicateEvents.length}
          </p>
        </div>

        <div className="rounded-xl bg-[var(--background)] p-4">
          <p className="text-sm text-[var(--muted)]">Conflicts</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {preview.conflicts.length}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="mb-3 font-semibold text-[var(--text)]">
          Inventory impact
        </h4>

        {preview.impact.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No inventory changes to display.
          </p>
        ) : (
          <div className="space-y-3">
            {preview.impact.map((item) => (
              <div
                key={item.productKey}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--background)] p-3"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Balance: {item.balanceBefore} → {item.balanceAfter}
                  </p>
                </div>

                <span className="text-sm font-bold text-[var(--text)]">
                  {item.delta > 0 ? "+" : ""}
                  {item.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview.conflicts.length > 0 && (
        <p className="mt-4 text-sm text-red-500">
          Conflicts were found. Resolve them before importing.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!preview.canImport || importing}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importing ? "Importing..." : "Confirm import"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={importing}
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:opacity-75"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
