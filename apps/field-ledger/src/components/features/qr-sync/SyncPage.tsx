
import type { TransferState } from "@carrysync/camera";
import { useRef, useState } from "react";
import { describeError } from "@carrysync/domain";
import {
  QrCode,
  Share2,
  ArrowDownToLine,
  CheckCircle2,
  Package,
} from "lucide-react";

import { useInventory } from "../../../hooks/useInventory";
import QrDisplay from "./components/QrDisplay";
import QrScanner from "./components/QrScanner";
import ImportReview from "./components/ImportReview";
import TransferStatus from "./components/TransferStatus";

interface QrBatch {
  svg: string;
  payload: string;
  index: number;
  total: number;
  bytes: number;
  eventCount: number;
}

type StatusType = "success" | "error" | "info";

type ImportPreview = Awaited<
  ReturnType<
    NonNullable<
      ReturnType<typeof useInventory>["service"]
    >["previewImport"]
  >
>;

export default function SyncPage() {
  const { service, history, loading, error } = useInventory();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrCodes, setQrCodes] = useState<QrBatch[]>([]);
  const [activeQr, setActiveQr] = useState(0);

  const [scannerText, setScannerText] = useState("");
  const [preview, setPreview] = useState<
    (ImportPreview & { payload: string }) | null
  >(null);

  // Prevent outdated async previews from being used.
  const reviewRevision = useRef(0);

  const [exporting, setExporting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("info");

  const showStatus = (
    message: string,
    type: StatusType = "info"
  ) => {
    setStatus(message);
    setStatusType(type);
  };

  // Invalidate the preview whenever the payload changes.
  const handleScannerTextChange = (text: string) => {
    reviewRevision.current += 1;

    setScannerText(text);
    setPreview(null);
    setReviewing(false);

    if (preview || reviewing) {
      showStatus(
        "Payload changed. Review it again before importing."
      );
    }
  };

  const toggleMovement = (eventId: string) => {
    setSelectedIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    );
  };

  // Generate QR codes for selected movements.
  const handleExport = async () => {
    if (!service || selectedIds.length === 0) {
      showStatus("Select at least one movement to export.", "error");
      return;
    }

    try {
      setExporting(true);
      setQrCodes([]);
      setActiveQr(0);

      const batches = await service.prepareExport(selectedIds);

      setQrCodes(batches);

      showStatus(
        `${batches.length} QR code(s) generated successfully.`,
        "success"
      );
    } catch (err) {
      showStatus(describeError(err).message, "error");
    } finally {
      setExporting(false);
    }
  };

  // Review the incoming QR payload before importing.
  const handleReview = async () => {
    if (!service || !scannerText.trim()) {
      showStatus("Enter a QR payload first.", "error");
      return;
    }

    const payload = scannerText.trim();
    const revision = ++reviewRevision.current;

    try {
      setReviewing(true);
      setPreview(null);

      const result = await service.previewImport(payload);

      // Ignore results from an outdated review request.
      if (revision !== reviewRevision.current) return;

      setPreview({ ...result, payload });

      showStatus(
        "Import preview generated successfully.",
        "success"
      );
    } catch (err) {
      if (revision === reviewRevision.current) {
        showStatus(describeError(err).message, "error");
      }
    } finally {
      if (revision === reviewRevision.current) {
        setReviewing(false);
      }
    }
  };

  // Import only the exact payload that was reviewed.
  const handleImport = async () => {
    if (
      !service ||
      !preview?.canImport ||
      preview.payload !== scannerText.trim()
    ) {
      showStatus(
        "Please review the current payload before importing.",
        "error"
      );
      return;
    }

    try {
      setImporting(true);

      const result = await service.importPayload(preview.payload);

      reviewRevision.current += 1;
      setPreview(null);
      setScannerText("");

      showStatus(
        `Import complete. ${result.added} movement(s) added.`,
        "success"
      );
    } catch (err) {
      showStatus(describeError(err).message, "error");
    } finally {
      setImporting(false);
    }
  };

  // Cancel the current import review.
  const clearImport = () => {
    reviewRevision.current += 1;

    setPreview(null);
    setScannerText("");
    setReviewing(false);

    showStatus("Import review cancelled.", "info");
  };

  // Handle imports completed directly through the camera scanner.
  const handleCameraImported = (result: TransferState) => {
    reviewRevision.current += 1;

    setPreview(null);
    setScannerText("");
    setReviewing(false);

    if (result.state === "imported") {
      showStatus(
        `Import complete. ${result.result.added} movement(s) added.`,
        "success"
      );
    } else if (result.state === "duplicate") {
      showStatus(
        "These movements were already imported.",
        "info"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-[var(--muted)]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
        Loading CarrySync...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-50 p-6 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-300">
        {error || "CarrySync service is unavailable."}
      </div>
    );
  }

  const cardStyle =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_4px_20px_rgba(0,84,95,0.04)] transition-colors duration-300 sm:p-6";

  const buttonStyle =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[var(--background)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";

  const allSelected =
    history.length > 0 &&
    history.every((movement) =>
      selectedIds.includes(movement.eventId)
    );

  return (
    <div className="mx-auto max-w-[1200px] space-y-7">
      {/* PAGE INTRO */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--soft-surface)] via-[var(--surface)] to-[var(--background)] p-4 shadow-sm transition-colors duration-500 sm:rounded-3xl sm:p-6 lg:p-7">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] sm:h-2 sm:w-2" />

              <span className="text-[9px] font-extrabold tracking-[1.5px] text-[var(--muted)] sm:text-[10px] sm:tracking-[1.8px]">
                DEVICE CONNECTIVITY
              </span>
            </div>

            <h2 className="text-xl font-black tracking-tight text-[var(--text)] min-[400px]:text-2xl sm:text-3xl">
              QR Sync
            </h2>

            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-sm">
              Transfer inventory movements securely between CarrySync devices
              using QR codes.
            </p>
          </div>

          <div className="grid h-12 w-12 shrink-0 place-items-center self-start rounded-xl bg-[var(--primary)] text-[var(--background)] shadow-md transition-transform duration-300 hover:rotate-6 hover:scale-105 sm:h-16 sm:w-16 sm:self-center sm:rounded-2xl lg:h-20 lg:w-20">
            <QrCode
              size={26}
              strokeWidth={1.7}
              className="sm:h-8 sm:w-8 lg:h-10 lg:w-10"
            />
          </div>
        </div>

        {/* DECORATIVE BACKGROUND */}
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border-[20px] border-[var(--primary)]/5 sm:-right-10 sm:-top-16 sm:h-52 sm:w-52 sm:border-[30px]" />

        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-28 w-28 rounded-full bg-[var(--accent)] opacity-[0.05] blur-3xl sm:h-40 sm:w-40" />
      </section>

      {/* TRANSFER STATUS */}
      <TransferStatus message={status} type={statusType} />

      {/* TRANSFER OPTIONS */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* SHARE MOVEMENTS */}
        <section className={cardStyle}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
                <Share2 size={21} />
              </div>

              <h3 className="text-lg font-extrabold text-[var(--text)]">
                Share inventory
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                Select movements and generate QR codes to export.
              </p>
            </div>

            <span className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
              {selectedIds.length} selected
            </span>
          </div>

          {history.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <Package
                size={28}
                className="mb-2 text-[var(--muted)]"
              />

              <p className="text-sm font-bold text-[var(--text)]">
                No movements yet
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Your inventory activity will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Available movements
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      allSelected
                        ? []
                        : history.map((movement) => movement.eventId)
                    )
                  }
                  className="text-xs font-bold text-[var(--primary)] hover:opacity-70"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {history.map((movement) => {
                  const selected = selectedIds.includes(
                    movement.eventId
                  );

                  return (
                    <label
                      key={movement.eventId}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                        selected
                          ? "border-[var(--primary)] bg-[var(--soft-surface)]"
                          : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleMovement(movement.eventId)
                        }
                        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[var(--text)]">
                          {movement.productLabel}
                        </span>

                        <span className="mt-1 block text-[10px] text-[var(--muted)]">
                          {movement.direction} · {movement.quantity} ·{" "}
                          {new Date(movement.createdAt).toLocaleString()}
                        </span>
                      </span>

                      {selected && (
                        <CheckCircle2
                          size={17}
                          className="shrink-0 text-[var(--primary)]"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={selectedIds.length === 0 || exporting}
            className={`${buttonStyle} mt-5 w-full`}
          >
            <QrCode size={17} />

            {exporting
              ? "Generating QR..."
              : `Generate QR (${selectedIds.length})`}
          </button>
        </section>

        {/* RECEIVE MOVEMENTS */}
        <section className={cardStyle}>
          <div className="mb-5">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
              <ArrowDownToLine size={21} />
            </div>

            <h3 className="text-lg font-extrabold text-[var(--text)]">
              Receive inventory
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Scan a QR code from another device or enter its payload.
            </p>
          </div>

          <QrScanner
            value={scannerText}
            onChange={handleScannerTextChange}
            onReview={handleReview}
            reviewing={reviewing}
            service={service}
            onCameraImported={handleCameraImported}
          />
        </section>
      </div>

      {/* GENERATED QR CODES */}
      {qrCodes.length > 0 && (
        <section className={`${cardStyle} space-y-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <QrCode
                  size={20}
                  className="text-[var(--primary)]"
                />

                <h3 className="text-lg font-extrabold text-[var(--text)]">
                  Generated QR codes
                </h3>
              </div>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Scan each QR code to transfer your movements.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-[var(--soft-surface)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
              {qrCodes.length} batches
            </span>
          </div>

          {qrCodes[activeQr] && (
            <QrDisplay qr={qrCodes[activeQr]} />
          )}

          {qrCodes.length > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                disabled={activeQr === 0}
                onClick={() =>
                  setActiveQr((current) => current - 1)
                }
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--hover)] disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs font-bold text-[var(--muted)]">
                {activeQr + 1} / {qrCodes.length}
              </span>

              <button
                type="button"
                disabled={activeQr === qrCodes.length - 1}
                onClick={() =>
                  setActiveQr((current) => current + 1)
                }
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--hover)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setQrCodes([]);
              setSelectedIds([]);
              setActiveQr(0);
            }}
            className="text-xs font-bold text-[var(--muted)] transition hover:text-red-500"
          >
            Clear generated QR codes
          </button>
        </section>
      )}

      {/* IMPORT PREVIEW */}
      {preview && (
        <ImportReview
          preview={preview}
          onConfirm={handleImport}
          onCancel={clearImport}
          importing={importing}
        />
      )}
    </div>
  );
}
