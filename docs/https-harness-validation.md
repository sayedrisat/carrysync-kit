# HTTPS harness preparation and validation — 2026-11-03

Repository: `/home/risat/VS-Files/Hackathon/carrysync-kit/carrysync-kit`. Preparation branch: `feature/camera-https-harness`. Work in this record is Codex implementation/review, not Kiro execution.

## Reviewed Phase 3 integration

The input branch was clean at `2413328f8dfe6ef68b1cf1a48c75f73aabdfeeff`. Its existing CI passed. Current main also contained newer documentation/provenance changes and a separate `docs/engineering-portfolio-20261102` branch; both were inspected and preserved.

[Phase 3 PR #3](https://github.com/sayedrisat/carrysync-kit/pull/3) received a recorded technical self-review of media ownership, asynchronous cleanup, confirmation/single-flight behavior, core reuse, payload bounds, local decoder packaging and test evidence. Fresh local checks reproduced 95 unit/property and 18 browser passes. The [PR merge-candidate CI](https://github.com/sayedrisat/carrysync-kit/actions/runs/41574151727) passed; no blocking source finding or merge permission restriction remained.

The PR merged as **`8836967843cb6ff899e32f9771675acfd3541cf0`**. No independent GitHub approval is claimed. Source/documentation branches were not deleted or force-pushed; main's newer README/provenance additions remain intact.

## Static hosting changes

- The existing camera harness uses relative production asset paths, so it works under `/carrysync-kit/` as well as a root deployment. No teammate app UI changes were made.
- Public source SHA is visible in the page and `build-info.json`. Only a full public Git hash can be supplied via `CARRYSYNC_BUILD_SHA`; local builds honestly show `local-unversioned`.
- CSP restricts script/connect/media sources and permits the local WASM runtime. A local static server serves exact built files with JavaScript/WASM MIME types and no HTML-success fallback for missing assets.
- Artifact validation checks seven expected files, relative HTML references, lazy JS/WASM/notices, no links to source trees, no env/key/map files or symlinks, and no credential-pattern matches.
- The main-only GitHub Pages workflow verifies install/lint/types/unit/property/build/import/browser checks before publishing only the audited dist directory. After publication it runs the four live HTTPS tests and compares metadata to the deployed source SHA.
- GitHub admin authentication provides an authorized path to free Pages hosting on this public repository. No custom deployment secrets, server, paid account, certificate/private-key upload, or phone trust changes are required.

## Executed local validation

| Check | Actual result |
| --- | --- |
| `npm ci` | Passed, clean reproducible installation |
| `npm run check` | Passed: lint, workspace/tooling types, unit/property tests, all builds, public import/isolation checks |
| `npm test` (inside check) | **95 passed**, 0 failed/skipped; original 1,400 generated cases/seeds preserved |
| `npm run test:browser` | **22 passed**, 0 failed/skipped: original 18 + four exact-production-artifact tests |
| `npm run build:harness` | Passed; seven-file artifact audit passed |
| `npm audit --omit=dev` | Zero production vulnerabilities reported |

The previous 11 moderate development-tool audit findings remain documented; no incompatible forced upgrade was introduced.

Production tests load the actual built HTML/JS at a repository subpath, read source metadata/notices, perform persistent manual import/reopen, and decode synthetic video using the actual browser media API plus local WASM for both application formats. They verify correct WASM MIME, no foreign-origin requests, confirmation before writes, track cleanup and missing/source/secret-path rejection. The existing synthetic-camera fixture is shared without removing prior assertions.

The explicit live configuration reuses only these four production tests against `CARRYSYNC_TEST_URL`, with optional expected SHA. One retry is allowed for hosting propagation; assertions are unchanged. Live results must be read from the actual deployment run, not inferred from local tests.

## Publication and verification records

Canonical endpoint: **https://sayedrisat.github.io/carrysync-kit/**. [Pages workflow history](https://github.com/sayedrisat/carrysync-kit/actions/workflows/pages.yml) records enablement/build/deployment/post-publication verification. The page's [public metadata](https://sayedrisat.github.io/carrysync-kit/build-info.json) identifies the deployed commit. The final execution report links the actual successful run or states the exact blocker; this pre-publication source record does not invent a live result.

Run `CARRYSYNC_TEST_URL=https://sayedrisat.github.io/carrysync-kit/ npm run test:live` to recheck the live HTTPS bundle. See [deployment instructions](https-deployment.md) for enablement/redeployment or another authorized free static host.

## Preserved boundaries

Both application source trees, the core/persistence/camera SDK sources, and genuine Kiro specs/`tasks.meta.json` remain unchanged. Frontend handoff now describes the merged JavaScript APIs and origin-specific persistence. [Phone acceptance](phone-acceptance.md) remains unexecuted and [the evidence template](templates/phone-test-evidence.md) deliberately contains NOT RUN results.

Static HTTPS and automated desktop synthetic camera checks are not physical two-phone acceptance, Android/iOS/Safari certification, a device radio-disabled result, or installed/offline-reopening PWA support. Actual phone testing remains necessary and must be recorded honestly.
