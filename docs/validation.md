# Day 1 validation record

Executed **2026-11-02 (Asia/Dhaka)** in `/home/risat/VS-Files/Hackathon/carrysync-kit`. This is Codex execution evidence, not Kiro activity. No pre-existing project files or Git history were present.

## Environment

- Node `24.21.0` (24 LTS), npm `11.19.0`, Git `2.53.0`, GitHub CLI `2.102.0`.
- GitHub CLI authenticated as `sayedrisat`; authentication tokens were not added to the project.
- Desktop browser: Google Chrome `156.0.8078.47`, headless Playwright automation.
- Root workspaces resolve both applications to the same local `@carrysync/core@0.1.0`.

## Executed checks

| Command/check | Actual result |
| --- | --- |
| `npm install` | Completed; root lockfile generated |
| `npm ci` | Completed; reproducible install verified |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | Passed for core, both apps, SDK tests and browser/tooling configuration |
| `npm test` | **28 tests passed** |
| fast-check properties (inside `npm test`) | **4 × 300 generated cases passed**, seed `20261102`: idempotence, commutativity, associativity, sequential order independence for compatible events |
| `npm run build` | SDK ESM/declarations and both production application bundles built |
| `npm run verify:import` | Public package import, create/export/decode/equality and duplicate-safe import passed; sample stock QR payload 296 bytes |
| `npm run check` | All above component checks passed together |
| `npm run test:browser` | **3 tests passed**; actual SVG screenshots decoded with jsQR; both app flows, duplicate safety, malformed import, narrow viewport, independent contexts and wrong-app rejection |
| `npm audit --omit=dev` | **0 production vulnerabilities reported** |
| `npm audit` | **11 moderate development dependency findings**, no high/critical findings; see below |

The browser tests assert no uncaught page errors in each app's basic flow. They use the real SDK adapters with session-only memory stores. Transfer between contexts used image-decoded payload text; it was not a physical phone camera scan.

Early type errors in QR byte-segment typing/test fixtures were fixed. Initial property callbacks incorrectly returned matcher results; they were changed to assertion blocks without weakening the assertions, and all generated properties then passed. These failed runs are not counted as successes.

## Dependency advisory still open

The full audit reports `minimatch@10.2.6` and its development-tool dependency paths through ESLint/typescript-eslint under [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (pattern-amplification denial of service). At setup time current ESLint `10.14.0`, `@eslint/config-array` and typescript-eslint `8.72.1` still request minimatch 10; the advisory's patched release is 11.0.1. The 11 audit entries include transitive affected-tool paths, not 11 distinct runtime bugs. No incompatible major override, downgrade or `npm audit fix --force` was applied. Production dependency audit is clean. Recheck upstream compatible fixes before widening developer tooling exposure or release.

## Repository hygiene

Inspect the staged source tree before publishing: both app folders, core/tests, docs, Kiro steering and CI must be present. `.kiro/` is tracked. `.gitignore` excludes root/nested `node_modules/`, all `dist/`, test outputs, `.env*` (except a deliberate example), credential key files and local editor files. Root `package-lock.json` is tracked; generated builds and browser artifacts are not. A source/lockfile inspection and credential-pattern scan are part of the final pre-commit review; no deliberate credentials/private fixtures are included.

## Explicitly unverified/future

- IndexedDB durability, persistent device identity, browser reopen retention, multi-tab DB behavior and migrations.
- Camera permission/acquisition, physical two-phone scanning, image quality limits and real transfer range/reliability.
- Service worker/manifest installation, asset caching, airplane-mode reopen and true installed offline operation.
- Application-specific inventory state, quiz relationships/answer correctness/grading, and conflict recovery.
- Kiro-generated specs, hooks, custom-agent execution and genuine Kiro evidence.

The local record above does not assert a GitHub Actions result. The initial push triggers the workflow; inspect the actual run on the [Actions page](https://github.com/sayedrisat/carrysync-kit/actions). The final execution report states whether remote CI was verified or blocked.
