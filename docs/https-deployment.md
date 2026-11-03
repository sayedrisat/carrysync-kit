# Free static HTTPS camera harness

Canonical test URL: **https://sayedrisat.github.io/carrysync-kit/**. GitHub Pages is the selected free static host for this public repository; it uses existing authorized GitHub access, without a server, API keys, TLS private keys in source, or a paid hosting service. Publication/live verification is recorded in [the execution report](https-harness-validation.md).

## What is published

Only `packages/carrysync-camera/harness/dist/`, generated from the reviewed main commit. It contains the HTML, bundled JavaScript, lazy decoder chunk, reader WASM, decoder notices, `.nojekyll` and public `build-info.json`. Teammate application sources, repository metadata, Node modules, environment files, cert/key files and source maps are not uploaded.

Vite uses `base: './'`: the same artifact works at a site root or repository subpath. The real built files are tested under `/carrysync-kit/` using a minimal local static server with no Vite/HTML asset fallback. Browser tests verify JS, decoder WASM/MIME, notices, metadata and imports on that same origin. The CSP limits script/connect/media/image requests appropriately; there is no CDN dependency. Build metadata exposes only a full public source commit hash, never environment contents.

The harness is public demo tooling. Browser events/device IDs remain local to each origin/profile; camera frames are not uploaded. Use only non-sensitive fixtures. Initial HTML/assets are downloaded; no PWA install/offline-reopening guarantee exists.

## Reproduce locally

```bash
cd /home/risat/VS-Files/Hackathon/carrysync-kit/carrysync-kit
npm ci
npm run build:camera
CARRYSYNC_BUILD_SHA=$(git rev-parse HEAD) npm run build:harness
npm run preview:camera
# http://127.0.0.1:5177/carrysync-kit/
```

`npm run build:harness` also audits the artifact for allowed file types, relative assets and credential-like patterns. `npm run test:browser` builds the artifact and starts all needed test servers; the production camera tests use synthetic video, not physical phones. `npm run check` covers all other checks.

## GitHub Pages deployment/redeployment

`.github/workflows/pages.yml` runs only on main push or explicit main dispatch. Its verify/build job first runs clean install, full checks and all browser tests; deploy depends on that job. It uploads only the audited static folder and uses the automatic Actions token + OIDC with job-scoped Pages permissions. After publication, the deployment job also runs the four live HTTPS browser checks and verifies the page metadata matches the deployed SHA. There are no custom deployment secrets. Source branches do not publish.

If Pages has not been enabled, an authorized repository admin can configure the existing repository once:

```bash
gh api repos/sayedrisat/carrysync-kit/pages
# Only if that returns 404 (no existing site):
gh api --method POST repos/sayedrisat/carrysync-kit/pages -f build_type=workflow
```

For this repository, the agent performs the authorized enablement/deployment if permissions permit. If API authorization fails, the equivalent browser action is **Settings → Pages → Build and deployment → Source: GitHub Actions**. Do not create another repository or overwrite an existing custom-domain/site configuration.

After the workflow is merged on main, redeploy the current verified source with:

```bash
gh workflow run pages.yml --ref main --repo sayedrisat/carrysync-kit
gh run list --repo sayedrisat/carrysync-kit --workflow pages.yml --limit 3
gh run watch <RUN_ID> --repo sayedrisat/carrysync-kit --exit-status
```

Verify the actual deployment rather than assuming an artifact upload means a live site:

```bash
curl --fail --head https://sayedrisat.github.io/carrysync-kit/
curl --fail https://sayedrisat.github.io/carrysync-kit/build-info.json
CARRYSYNC_TEST_URL=https://sayedrisat.github.io/carrysync-kit/ npm run test:live
```

Live verification is four desktop Chromium tests against the HTTPS site, including real WASM decode of synthetic camera video for both apps. It is separate from physical acceptance. A changed hosting origin creates a different IndexedDB store/device identity; localhost, LAN HTTPS and GitHub Pages do not share browser storage.

## Other free static hosts / local HTTPS fallback

Run the build commands above and upload the **entire contents** of `packages/carrysync-camera/harness/dist/` to any authorized free HTTPS static host. Preserve `assets/`, lazy JavaScript, WASM, notices and metadata; serve `.js` as JavaScript and `.wasm` as `application/wasm`. Do not publish the repository/root or add an HTML-success fallback for missing assets. The relative-base artifact requires no server/API. A new host must be tested again using `CARRYSYNC_TEST_URL`.

For LAN development, trusted certificate files can remain outside the repository:

```bash
CARRYSYNC_TLS_CERT=/absolute/path/to/trusted-cert.pem \
CARRYSYNC_TLS_KEY=/absolute/path/to/private-key.pem \
npm run dev:camera:lan
```

Both phones must trust the certificate and open its matching HTTPS hostname/IP. Plain LAN HTTP is not sufficient for camera access. No certificate generation/phone trust changes are part of the static deployment task.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite static deployment](https://vite.dev/guide/static-deploy.html).
