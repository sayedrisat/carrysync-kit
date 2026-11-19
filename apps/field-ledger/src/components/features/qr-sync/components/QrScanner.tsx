import { useEffect, useRef, useState } from "react";
import {
  CameraScanner,
  type CameraState,
  type TransferState,
} from "@carrysync/camera";
import decoderWasmUrl from "@carrysync/camera/decoder.wasm?url";
import cameraNoticesUrl from "@carrysync/camera/notices?url";

import { useInventory } from "../../../../hooks/useInventory";

type FieldLedgerService = NonNullable<
  ReturnType<typeof useInventory>["service"]
>;

interface QrScannerProps {
  value: string;
  onChange: (value: string) => void;
  onReview: () => void;
  reviewing: boolean;
  service: FieldLedgerService;
  onCameraImported: (result: TransferState) => void;
}

export default function QrScanner({
  value,
  onChange,
  onReview,
  reviewing,
  service,
  onCameraImported,
}: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<CameraScanner | null>(null);

  const [camera, setCamera] = useState<CameraState>({
    state: "idle",
  });

  const [transfer, setTransfer] = useState<TransferState>({
    state: "idle",
  });

  useEffect(() => {
    const scanner = new CameraScanner({
      app: service.app,
      importer: service,
      wasmUrl: decoderWasmUrl,
    });

    scannerRef.current = scanner;

    const unsubscribeCamera = scanner.subscribe(setCamera);
    const unsubscribeImport = scanner.imports.subscribe(setTransfer);

    return () => {
      unsubscribeCamera();
      unsubscribeImport();
      scanner.dispose();

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }
    };
  }, [service]);

  const startCamera = () => {
    if (videoRef.current) {
      void scannerRef.current?.start(videoRef.current);
    }
  };

  const stopCamera = () => {
    scannerRef.current?.stop();
  };

  const confirmCameraImport = async () => {
    const result = await scannerRef.current?.imports.confirmImport();

    if (result?.state === "imported" || result?.state === "duplicate") {
      onCameraImported(result);
    }
  };

  const cancelCameraImport = () => {
    scannerRef.current?.imports.clear();
  };

  const cameraBusy =
    camera.state === "requesting" ||
    camera.state === "scanning";

  const importing = transfer.state === "importing";

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="text-lg font-bold text-[var(--text)]">
        Receive inventory
      </h3>

      <p className="mt-1 text-sm text-[var(--muted)]">
        Scan a QR code using your camera or paste a payload manually.
      </p>

      {/* CAMERA SCANNER */}
      <div className="mt-5 space-y-3">
        <h4 className="text-sm font-semibold text-[var(--text)]">
          Scan using camera
        </h4>

        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full rounded-xl bg-black object-contain"
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startCamera}
            disabled={cameraBusy || importing || transfer.state === "review"}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {camera.state === "requesting"
              ? "Starting camera..."
              : camera.state === "scanning"
                ? "Camera active"
                : "Start camera"}
          </button>

          <button
            type="button"
            onClick={stopCamera}
            disabled={!cameraBusy}
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop camera
          </button>
        </div>

        <p role="status" aria-live="polite" className="text-sm text-[var(--muted)]">
          {camera.state === "error"
            ? camera.message
            : camera.state === "scanning"
              ? "Camera is active. Point it at a CarrySync QR code."
              : camera.state === "requesting"
                ? "Waiting for camera permission..."
                : camera.state === "stopped"
                  ? "Camera stopped."
                  : camera.state === "disposed"
                    ? "Camera scanner closed."
                    : "Start the camera to scan a QR code."}
        </p>

        <a
          href={cameraNoticesUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-500 underline"
        >
          Camera decoder notices
        </a>
      </div>

      {/* CAMERA IMPORT REVIEW */}
      {transfer.state === "review" && (
        <div className="mt-5 rounded-xl border border-blue-500/30 bg-[var(--background)] p-4">
          <h4 className="font-semibold text-[var(--text)]">
            QR code detected — review before importing
          </h4>

          <p className="mt-2 text-sm text-[var(--muted)]">
            {transfer.envelope.events.length} event(s) found in this QR code.
          </p>

          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {transfer.envelope.events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-[var(--border)] p-3 text-xs text-[var(--text)]"
              >
                <p className="font-semibold">{event.type}</p>
                <p className="mt-1 break-all text-[var(--muted)]">
                  {event.id}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void confirmCameraImport()}
              disabled={importing}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm import
            </button>

            <button
              type="button"
              onClick={cancelCameraImport}
              disabled={importing}
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CAMERA IMPORT RESULT */}
{transfer.state === "imported" && (
  <div
    role="status"
    aria-live="polite"
    className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text)]"
  >
    {transfer.result.added} movement(s) imported successfully.
  </div>
)}

{transfer.state === "duplicate" && (
  <div
    role="status"
    aria-live="polite"
    className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text)]"
  >
    These movements have already been imported.
  </div>
)}

{transfer.state === "error" && (
  <div
    role="status"
    aria-live="polite"
    className="mt-4 rounded-xl border border-red-500/30 p-3 text-sm text-red-500"
  >
    {transfer.code}: {transfer.message}
  </div>
)}

      {/* MANUAL PAYLOAD FALLBACK */}
      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <h4 className="text-sm font-semibold text-[var(--text)]">
          Or paste QR payload
        </h4>

        <label
          htmlFor="scanner-text"
          className="mb-2 mt-3 block text-sm text-[var(--muted)]"
        >
          QR payload
        </label>

        <textarea
          id="scanner-text"
          aria-label="Scanner text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          placeholder="Paste the QR payload here..."
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={onReview}
          disabled={!value.trim() || reviewing}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reviewing ? "Reviewing..." : "Review"}
        </button>
      </div>
    </section>
  );
}