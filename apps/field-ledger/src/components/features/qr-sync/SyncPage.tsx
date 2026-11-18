import type { TransferState } from "@carrysync/camera";
import { useState } from "react";
import { describeError } from "@carrysync/domain";

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

export default function SyncPage() {
    type ImportPreview = Awaited<
  ReturnType<
    NonNullable<ReturnType<typeof useInventory>["service"]>["previewImport"]
  >
>;
  const { service, history, loading, error } = useInventory();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrCodes, setQrCodes] = useState<QrBatch[]>([]);
  const [activeQr, setActiveQr] = useState(0);

  const [scannerText, setScannerText] = useState("");
const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("info");

  const showStatus = (message: string, type: StatusType = "info") => {
    setStatus(message);
    setStatusType(type);
  };

  const toggleMovement = (eventId: string) => {
    setSelectedIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    );
  };

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

  const handleReview = async () => {
    if (!service || !scannerText.trim()) {
      showStatus("Enter a QR payload first.", "error");
      return;
    }

    try {
      setReviewing(true);
      setPreview(null);

      const result = await service.previewImport(scannerText.trim());

      setPreview(result);

      showStatus("Import preview generated successfully.", "success");
    } catch (err) {
      showStatus(describeError(err).message, "error");
    } finally {
      setReviewing(false);
    }
  };

  const handleImport = async () => {
    if (!service || !preview?.canImport) return;

    try {
      setImporting(true);

      const result = await service.importPayload(scannerText.trim());

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

  const clearImport = () => {
    setPreview(null);
    setScannerText("");
    showStatus("Import review cancelled.", "info");
  };
  const handleCameraImported = (result: TransferState) => {
  setPreview(null);
  setScannerText("");

  if (result.state === "imported") {
    showStatus(
      `Import complete. ${result.result.added} movement(s) added.`,
      "success"
    );
  } else if (result.state === "duplicate") {
    showStatus("These movements were already imported.", "info");
  }
};

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-6 text-sm text-[var(--muted)]">
        Loading FieldLedger...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-2xl border border-red-500/30 p-6 text-sm text-red-500">
        {error || "FieldLedger service is unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold tracking-widest text-blue-500">
          DATA TRANSFER
        </span>

        <h2 className="mt-2 text-2xl font-bold text-[var(--text)]">
          QR Sync
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Transfer inventory movements between FieldLedger devices.
        </p>
      </div>

      <TransferStatus message={status} type={statusType} />

      {/* SHARE MOVEMENTS */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="text-lg font-bold text-[var(--text)]">
          Share inventory
        </h3>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Select the movements you want to transfer.
        </p>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            No movements available to export yet.
          </p>
        ) : (
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {history.map((movement) => (
              <label
                key={movement.eventId}
                className="flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--background)] p-3"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(movement.eventId)}
                  onChange={() => toggleMovement(movement.eventId)}
                  className="h-4 w-4 accent-blue-600"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">
                    {movement.productLabel}
                  </span>

                  <span className="text-xs text-[var(--muted)]">
                    {movement.direction} · {movement.quantity} ·{" "}
                    {new Date(movement.createdAt).toLocaleString()}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={selectedIds.length === 0 || exporting}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "Generating QR..." : `Generate QR (${selectedIds.length})`}
        </button>
      </section>

      {/* GENERATED QR */}
      {qrCodes.length > 0 && (
        <div className="space-y-4">
{qrCodes[activeQr] && (
  <QrDisplay qr={qrCodes[activeQr]} />
)}
          {qrCodes.length > 1 && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={activeQr === 0}
                onClick={() => setActiveQr((current) => current - 1)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-[var(--muted)]">
                {activeQr + 1} / {qrCodes.length}
              </span>

              <button
                type="button"
                disabled={activeQr === qrCodes.length - 1}
                onClick={() => setActiveQr((current) => current + 1)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] disabled:opacity-40"
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
            }}
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
          >
            Clear generated QR codes
          </button>
        </div>
      )}

      {/* RECEIVE MOVEMENTS */}
  <QrScanner
  value={scannerText}
  onChange={setScannerText}
  onReview={handleReview}
  reviewing={reviewing}
  service={service}
  onCameraImported={handleCameraImported}
/>

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
