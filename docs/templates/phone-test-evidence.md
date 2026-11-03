# Physical-phone acceptance evidence — TEMPLATE, NOT EXECUTED

Copy this template to a new dated file in `docs/evidence/` only when actual phone testing occurs. Keep unperformed items **NOT RUN**; do not convert automated/synthetic browser results into physical-device evidence.

- Operator / test date / time zone: **not recorded**
- HTTPS test URL: **not recorded**
- Source commit shown on the page / build-info.json: **not recorded**
- Phone A model / OS / browser + version: **not recorded**
- Phone B model / OS / browser + version: **not recorded**
- Connection mode / radios explicitly disabled / tab versus installed PWA: **not recorded**
- Ready for Offline Use observed on A / B, with time: **not recorded**
- Installation method / OS termination method / all tabs closed: **not recorded**
- Baseline UUID A / B and app event IDs/counts: **not recorded**
- Public fixture data only / sensitive information redacted: **not checked**

| Case | Actual event ID / payload bytes | Before → after counts | Expected observation | Actual result | Evidence |
| --- | --- | --- | --- | --- | --- |
| FieldLedger A → B | — | — | Review makes no write; confirm adds once | NOT RUN | — |
| FieldLedger rescan | — | — | Duplicate, zero additions | NOT RUN | — |
| FieldLedger B → A | — | — | Matching IDs/content, once only | NOT RUN | — |
| QuizRelay A → B | — | — | Matching quiz/questions/options | NOT RUN | — |
| QuizRelay B → A + rescan | — | — | Reverse succeeds; duplicate adds zero | NOT RUN | — |
| Wrong destination app | — | — | WRONG_APPLICATION; unchanged destination | NOT RUN | — |
| Manual valid/invalid/version/conflict | — | — | Valid import/duplicate; bad inputs leave state intact | NOT RUN | — |
| Denied permission + manual fallback | — | — | Safe denial; fallback works | NOT RUN | — |
| Stop / background / navigation | — | — | Browser/OS capture indicator stops | NOT RUN | — |
| Online reload / same-profile browser reopen | — | — | Events/device UUID persist | NOT RUN | — |
| QuizRelay then FieldLedger selection after reload | — | — | Each chosen app persists; namespaces isolated | NOT RUN | — |
| Offline reload on A and B | — | — | Cached shell; selected app, events and UUID intact | NOT RUN | — |
| All tabs closed, URL reopened offline | — | — | Actual new navigation succeeds on both | NOT RUN | — |
| Installed icon reopened offline (if tested) | — | — | Shell/data/selection intact | NOT RUN | — |
| OS process termination/restart offline (if tested) | — | — | Record exact termination method/outcome | NOT RUN | — |
| Offline-after-reopen camera/QR/manual A → B / B → A, both apps | — | — | No decoder warm-up; additions/duplicates correct | NOT RUN | — |
| Reconnect / cached update / reopen | — | — | Both app event sets and UUIDs preserved | NOT RUN | — |
| Warmed open-page radios-off A → B / B → A | — | — | Actual observed transfer results, no reload | NOT RUN | — |

## Failures and reproducible observations

Not tested. For any failure record the exact steps, safe error code/message, lighting/distance/code density when relevant, and whether accepted state changed. Link genuine screenshots/video using public fixtures only. Do not include tokens, personal student data, private inventory or unrelated device content.

## Scope statement

- Physical two-phone transfer: **UNVERIFIED**
- Android/iOS/Safari behavior: **UNVERIFIED**
- Actual device radio-disabled open-page transfer: **UNVERIFIED**
- Offline reload / tab reopening: **NOT RUN**
- Installed PWA reopening / OS termination: **NOT RUN**
- Prior Phase 3 user-reported results are separate; do not pre-fill this new build as passing.

Record Codex/Kiro contributions accurately. Leave genuine Kiro specs and `tasks.meta.json` unchanged; this file records actual human/device testing, not AI tool execution.
