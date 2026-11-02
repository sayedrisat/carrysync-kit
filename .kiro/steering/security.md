---
inclusion: always
---
# Security rules

Scanned text is untrusted. Check UTF-8 size before parsing, require the supported version and destination app, validate every event, reject unknown fields, and make writes all-or-nothing. Never inject scanned text as HTML. Do not expose internal storage errors or log full payloads.

QR data is plaintext and unauthenticated. Review selected records before sharing; minimize fields and use pseudonymous classroom fixtures. Never add credentials, tokens, passwords or private user records to code, fixtures, screenshots, commits or QR exports. Schema validation is not sender authentication or confidentiality.

No production trust/security claims without a reviewed design. Inspect dependency audit results; do not force incompatible upgrades or hide advisories. Keep `.kiro/` tracked and secrets/build artifacts ignored. Never fabricate Kiro activity or physical device test results.
