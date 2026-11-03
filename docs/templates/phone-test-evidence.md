# Physical-phone acceptance evidence — TEMPLATE, NOT EXECUTED

Copy this template to a new dated file in `docs/evidence/` only when actual phone testing occurs. Keep unperformed items **NOT RUN**; do not convert automated/synthetic browser results into physical-device evidence.

- Operator / test date / time zone: **not recorded**
- HTTPS test URL: **not recorded**
- Source commit shown on the page / build-info.json: **not recorded**
- Phone A model / OS / browser + version: **not recorded**
- Phone B model / OS / browser + version: **not recorded**
- Connection mode (Wi-Fi/mobile data or warmed open-page radios-off): **not recorded**
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
| Warmed open-page radios-off A → B / B → A | — | — | Actual observed transfer results, no reload | NOT RUN | — |

## Failures and reproducible observations

Not tested. For any failure record the exact steps, safe error code/message, lighting/distance/code density when relevant, and whether accepted state changed. Link genuine screenshots/video using public fixtures only. Do not include tokens, personal student data, private inventory or unrelated device content.

## Scope statement

- Physical two-phone transfer: **UNVERIFIED**
- Android/iOS/Safari behavior: **UNVERIFIED**
- Actual device radio-disabled open-page transfer: **UNVERIFIED**
- Installed PWA / offline reopening: **NOT PART OF THIS TEST**

Record Codex/Kiro contributions accurately. Leave genuine Kiro specs and `tasks.meta.json` unchanged; this file records actual human/device testing, not AI tool execution.
