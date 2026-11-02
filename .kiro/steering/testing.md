---
inclusion: always
---
# Testing standards

Use Vitest and fast-check. Maintain round-trip, malformed/oversized/version/app rejection, duplicate, conflicting-ID, atomic rollback and detached snapshot tests. Property tests verify idempotence, commutativity, associativity and order independence for compatible event sets only. Preserve counterexamples; never weaken a failing invariant to pass.

`npm run check` runs lint, workspace/tooling typechecks, SDK tests, both builds and public package import proof. `npm run test:browser` checks real app adapters, rendered SVG image decoding and independent browser contexts. Test at a narrow viewport and watch browser errors.

Keep IndexedDB fake DB contract/property tests and real-browser reload/reopen, full same-profile Chrome restart, transaction abort/simulated quota failure and multi-tab writers passing. Only schema v1 is shipped; future real migrations need dedicated tests. PWA acceptance additionally requires airplane-mode reopen on devices. Distinguish automated desktop proof, remote CI, physical scanning and real offline persistence. Report skipped/failed checks accurately.
