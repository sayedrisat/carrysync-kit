import { useState } from 'react';
import { CarrySyncError, type SyncEvent, type QrExport } from '@carrysync/core';
import { carrysync } from './services/carrysync';
import { sampleInput } from './mocks/sample';

export default function App() {
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [selected, setSelected] = useState<SyncEvent | null>(null);
  const [qr, setQr] = useState<QrExport | null>(null);
  const [payload, setPayload] = useState('');
  const [status, setStatus] = useState('Ready. Create a sample event to begin.');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); }
    catch (error) {
      setStatus(error instanceof CarrySyncError ? `${error.code}: ${error.message}` : 'Unexpected error. Please retry.');
    } finally { setBusy(false); }
  }

  return <main>
    <p>CarrySync Kit · Day 1 developer proof of concept</p>
    <h1>FieldLedger</h1>
    <p>Session-only events. Refresh clears this demo. Camera scanning, IndexedDB and PWA caching are planned.</p>
    <button disabled={busy} onClick={() => void run(async () => {
      const event = await carrysync.createEvent(sampleInput);
      setSelected(event);
      setQr(null);
      setEvents(await carrysync.listEvents());
      setStatus('Sample created and validated. Review the event before sharing.');
    })}>Create sample event</button>
    <p>Stored events: <strong data-testid="event-count">{events.length}</strong></p>
    <h2>Review export</h2>
    <p>QR codes contain readable plaintext. Share only the selected demo event; never include names, secrets or private records.</p>
    <pre aria-label="Selected event">{selected ? JSON.stringify(selected, null, 2) : 'No event selected.'}</pre>
    <button disabled={busy || !selected} onClick={() => void run(async () => {
      if (!selected) return;
      const exported = await carrysync.prepareExport([selected]);
      setQr(exported);
      setPayload(exported.payload);
      setStatus(`QR ready: ${exported.bytes} UTF-8 bytes. Importing it here is a duplicate-safe local test.`);
    })}>Generate QR for selected event</button>
    {qr && <figure>
      <img width="360" height="360" alt="CarrySync transfer QR" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`} />
      <figcaption>{qr.bytes} bytes · {qr.eventCount} event · error correction M</figcaption>
    </figure>}
    <h2>Import scanner text</h2>
    <label htmlFor="payload">QR payload</label>
    <textarea id="payload" rows={7} value={payload} onChange={(event) => setPayload(event.target.value)} />
    <button disabled={busy || !payload} onClick={() => void run(async () => {
      const result = await carrysync.importPayload(payload);
      setEvents(await carrysync.listEvents());
      setStatus(`Import complete: ${result.added} added, ${result.duplicates} duplicate(s), ${result.total} total.`);
    })}>Validate and import</button>
    <p role="status" aria-live="polite">{status}</p>
    <details><summary>Accepted event set</summary><pre>{JSON.stringify(events, null, 2)}</pre></details>
  </main>;
}
