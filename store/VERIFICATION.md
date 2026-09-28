# Release verification — 1.0.1

Prepared September 29, 2026. These are local release-candidate checks, not store
approval. GitHub Actions repeats verification before stamping and publishing.

- `pnpm check` passed on macOS arm64 with Node.js 22.16.0 and pnpm 11.19.0.
- Oxlint, Oxfmt, application/test typechecking, and all 201 Vitest tests passed.
- Coverage gates passed: 60.68% statements, 59.75% branches, 49.06% functions,
  and 62.10% lines.
- All 18 Playwright Chromium tests passed with retries disabled. They cover
  save/paste, global snippets, library editing, backup/share flows, native
  Undo/Redo, keyboard handling, repeated fields, dialogs, and field guards.
- Chrome and Firefox production builds and package validation passed using
  the checked-in base version 1.0.0. The first Release workflow run stamps 1.0.1.
- The GitHub publishing environment contains both required variable names and
  all three required secret names; credential validity is checked at submission.
- No new Firefox runtime or source-reproducibility check was performed for this
  candidate. Firefox store submission and signed-build installation remain manual.

The earlier verification below applies only to the original 1.0.0 candidate.

## Historical verification — 1.0.0

Prepared September 23, 2026. This records local checks, not store approval.

- Chrome and Firefox production builds pass TypeScript and Vite compilation.
- ESLint passes; all 28 existing regression tests pass.
- Four 1280 × 800 screenshots were captured from the actual extension with
  synthetic data in an isolated Chromium profile. Snippet selection was
  checked to replace the target textarea value correctly.
- The extracted Chrome upload passes the existing browser smoke flow:
  add/edit/search, light/dark themes, narrow layout, enable toggle, field
  selection, save/paste, keyboard controls, password exclusion, cloning,
  share import, backup export/import, and confirmed deletion.
- An isolated source extraction with a fresh frozen-lockfile dependency
  installation reproduces byte-identical Chrome and Firefox ZIPs on Windows.
  Tailwind scans only `src/` so surrounding files cannot change the CSS.
- Firefox 141.0 (the available Playwright test runtime) accepts the temporary
  add-on; its MV3 module background page reaches RUNNING with no manifest
  warnings in Firefox's add-on debugger.
- `web-ext` 10.7.0 reports zero errors and three warnings. Two flag innerHTML
  inside the bundled React DOM implementation. One concerns data-consent
  compatibility on Android before version 142; Android is not targeted.
- The public GitHub Issues support URL returned HTTP 200.

The Firefox test driver cannot navigate extension-origin pages in this local
runtime, so full Firefox popup/options interaction has not been verified.
No testing on macOS, Linux, or Android is claimed. Final signed-store builds
still need an install check after store approval.

The publisher must publish the prepared privacy policy before Chrome
submission, and complete account-specific contact/distribution declarations.
