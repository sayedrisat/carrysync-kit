# Physical-phone acceptance — NOT EXECUTED

These are exact manual acceptance steps for Phase 3, not evidence of a passed phone test. Use public demo data only. Record results independently for FieldLedger and QuizRelay and for each transfer direction.

## Host the lead-owned harness securely

On the project machine:

```bash
cd /home/risat/VS-Files/Hackathon/carrysync-kit/carrysync-kit
npm ci
npm run dev:camera
# Desktop: http://localhost:5176
```

On a phone, `localhost` means the phone itself. A URL such as `http://192.168.x.x:5176` is not a secure camera context. Serve the harness through an existing HTTPS origin trusted by both phones, or provide a certificate/key for the development machine's actual LAN IP/DNS name:

```bash
CARRYSYNC_TLS_CERT=/absolute/path/to/trusted-cert.pem \
CARRYSYNC_TLS_KEY=/absolute/path/to/private-key.pem \
npm run dev:camera:lan
# On both phones: https://<certificate-matching-LAN-IP-or-DNS>:5176
```

Use a certificate trusted by both phones; clicking through an untrusted certificate warning is not a reliable camera setup. Generate/trust a development certificate using your normal local-CA workflow if needed. No CA installation, phone trust settings, firewall changes, deployment or certificate generation was performed by Codex. Keep keys outside the repository. The server fails if only one TLS path is supplied.

For static HTTPS hosting, `npm run build:harness` writes `packages/carrysync-camera/harness/dist/`; serve the entire directory, including the hashed decoder WASM, lazy JavaScript and notices assets. No paid deployment is required or configured.

## Acceptance sequence

1. Record source commit, date/time, both phone models/OS/browser versions, actual trusted HTTPS origin, destination app and starting accepted-event counts. Open the harness on **two physical phones A/B**. Separate devices should use their own browser storage; no shared browser profile is assumed.
2. Select **FieldLedger on both**. On A, press **Create sample event**, inspect the public selected event, then **Generate selected QR**. Record its event ID and complete UTF-8 payload byte length (must be ≤1,200).
3. On B, press **Start camera** and grant camera permission. Scan A's displayed QR. Verify B stops camera capture, shows the matching event ID/data for review, and its accepted-event count is still unchanged.
4. Press **Confirm import** on B. Verify exactly one new event is accepted and its ID/content matches A. Scan and confirm the same QR again; expect **duplicate**, zero additions and no increase in count.
5. On B create a **new** sample event and generate its QR. Scan/review/confirm on A. Verify the reverse transfer and duplicate re-scan. Event identity must remain unchanged across transport; the receiver must not regenerate IDs.
6. Keep A's FieldLedger QR visible but select **QuizRelay** on B, then scan. Expect `WRONG_APPLICATION`; no QuizRelay events should be accepted. Switch back to the correct destination.
7. Exercise manual fallback on B: a valid camera review fills the manual text field using core serialization. Change the existing stock event's `quantityDelta` to another valid nonzero integer **without changing its ID**, press **Review text**, then **Confirm import**. Expect `CONFLICTING_EVENT` and unchanged accepted records. Change text to `{` and review; expect `INVALID_PAYLOAD` with confirmation disabled. Restore original text, change numeric version 1 to 2, review; expect `UNSUPPORTED_VERSION`. A 1,201-byte ASCII text or multibyte text exceeding 1,200 UTF-8 bytes must reject as `PAYLOAD_TOO_LARGE`. These edits are fault tests using public fixtures, not a normal exchange workflow.
8. Deny camera permission in browser settings, retry Start, and verify `PERMISSION_DENIED` plus working manual review/import. Re-enable permission and retry. When feasible test unavailable/busy camera behavior. Press **Stop camera** during scanning, leave/background the page and navigate away: confirm OS/browser camera indicators stop. Return; capture must require another explicit Start.
9. Refresh B while networking is available and verify accepted events/device identity persist. Close/reopen the browser normally with the same origin/profile and verify persistence again. Do not confuse this online asset-loading check with offline PWA reopening.
10. Repeat steps 2–5 with **QuizRelay on both** using the sample quiz. Verify quiz title/question/options survive unchanged. Actual classroom UI, grading and student workflows remain the teammate/domain milestones.

## Already-open offline exchange — separate observation

Warm both phones while connected: on each app/page press **Start camera**, wait until the camera is scanning (decoder loaded), then **Stop camera**. Keep these pages open. Disable mobile data and Wi-Fi (or use airplane mode as supported), without navigating/reloading. Repeat A→B and B→A scan/review/confirm using the warmed pages and public sample events. Record actual results and camera indicators.

This checks whether an **already-open, warmed page** can exchange QR data with radios disabled. It does **not** prove installed PWA behavior, reliable asset caching, reopening offline, or migration safety. Do not close/reload offline and label it a supported flow; a service worker/PWA milestone is still required.

## Evidence to capture

Record per-step pass/fail, phone/browser versions, source commit, event IDs/byte counts, screenshots or a short actual screen recording where permitted, and any camera focus/permission/cleanup failures. Do not include secrets/private records. Mark unperformed steps unverified. No fabricated Kiro/phone evidence should be added to `tasks.meta.json`; record actual future device results in a new dated document.
