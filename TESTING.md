# Testing ClipJect

CI uses Node 24; locally use a supported Node version from `package.json` and the pnpm version pinned there.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
```

On Linux, use `pnpm exec playwright install --with-deps chromium` to install
browser system dependencies too. Browser tests start their own local fixture
server on port 4173; leave that port free.

## Commands

| Command              | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `pnpm test`          | Run all Vitest unit and DOM tests once                                             |
| `pnpm test:watch`    | Watch tests during development                                                     |
| `pnpm test:coverage` | Run Vitest with coverage gates and HTML/LCOV reports                               |
| `pnpm test:e2e`      | Build the Chrome extension and run Playwright                                      |
| `pnpm test:e2e:ui`   | Build and open the Playwright test UI                                              |
| `pnpm typecheck`     | Check application, tests, fixtures, and test configurations                        |
| `pnpm lint`          | Run Oxlint with TypeScript, React Hooks, and Refresh rules                         |
| `pnpm format`        | Format project files with Oxfmt (80 columns)                                       |
| `pnpm format:check`  | Check formatting without writing files                                             |
| `pnpm check`         | Lint, formatting, typecheck, coverage, browser tests, and Chrome/Firefox packaging |

For a focused run:

```sh
pnpm exec vitest run --project dom tests/dom/picker.test.tsx
pnpm test:e2e --grep 'password'
pnpm exec playwright show-report
```

`test:e2e` always builds first. When invoking `playwright test` directly, run
`pnpm build` first so you do not test a stale extension. Coverage is written to
`coverage/`, browser reports to `playwright-report/`, and failure artifacts to
`test-results/`. These directories are ignored by Git.

## Lint and formatting configuration

`.oxlintrc.json` carries the previous recommended ESLint/TypeScript checks,
React Hooks checks, and Refresh export exceptions. Native React Compiler
checks are enabled explicitly; they are experimental in Oxlint. Compiler
`config` and `gating` checks have no equivalent because Oxlint does not expose
those compiler options. Strict TypeScript covers the skipped strict-mode
syntax checks and undefined names. `no-useless-assignment` is enabled explicitly.
The Playwright fixture `use` callback is exempt from Rules of Hooks, and test
TSX files are exempt from Refresh export checks, as before.

`.oxfmtrc.json` retains 80-column formatting without import or package-key
sorting. Generated output, lockfiles, local QA artifacts, and vendored agent
skills are excluded. Run `pnpm format` before committing and `pnpm format:check`
to use the same formatting gate as CI.

## Test organization

- `tests/unit/`: storage, worker messaging, validation, sharing, Zustand stores,
  and browser-wrapper behavior. Runs in Node.
- `tests/dom/`: real React rendering, keyboard interaction, field identity,
  native insertion, focus observation, and element selection. Runs in jsdom with
  React Testing Library and user-event.
- `tests/helpers/`: typed synthetic data and a narrow extension API harness.
- `tests/e2e/`: Playwright tests of the production extension build in Chromium.
- `tests/e2e/fixtures/`: local React form including ordinary, password, readonly,
  repeated-name, maxlength, and native-dialog fields.

All tests, helpers, fixtures, and runner configurations use TypeScript. HTML is
limited to the fixture entry document. Test configuration is separate from Vite
extension packaging so CRXJS does not run during unit tests.

## Isolation and realistic boundaries

The storage harness imports independent module graphs for the service worker
and two clients. All clients use the real messaging and storage code. Tests
exercise concurrent saves, rejected writes, queue recovery, clone collisions,
merge/replace imports, and deletion. The mock implements structured cloning,
storage changes, and write failures; it does not mock ClipJect's business logic.

UI tests render actual components and hooks. Only browser boundaries are
substituted: extension APIs, layout measurements, and jsdom's missing scrolling.
The observer suite initializes the content observer once per document, resets
storage and focus per test, and mocks only mounting (the picker has its own
rendering tests). Zustand tests get fresh module instances per test. React trees,
timers, spies, globals, and module caches are cleaned up between cases.

Each browser test loads `dist/` into its own temporary Chromium profile. It uses
real extension storage, messaging, content scripts, Shadow DOM, and options
pages. No installed personal extension or browser profile is touched. Fixture
content is synthetic and local; no public website is required. Field selection
starts with the same message sent by the popup because toolbar chrome itself is
outside Playwright's page DOM. Popup toggle behavior is tested through the built
popup page.

Playwright uses the bundled `chromium` channel, which supports headless extension
loading. Retries are disabled so intermittent failures remain visible. Unexpected
failures retain traces and screenshots. Use those artifacts to diagnose failures
before increasing timeouts or adding retries.

## Browser regression coverage

`regressions.spec.ts` protects the six fixes merged into `dev`: host-field Enter,
Undo, readonly fields, repeated-name identity, maxlength, and modal layering.
These are ordinary passing tests; there are no expected-failure annotations.
`native-editing.spec.ts` also checks native input types, Undo/Redo, repeated
inserts, normalization, length limits changed during focus/selection, failed
editing commands, and overlay cleanup. These tests replace the old standalone
Chrome scripts and use the same Playwright runner and reports as extension flows.

jsdom cannot execute native editing commands. DOM tests substitute that browser
boundary; Chromium tests verify the real command and Undo history. Release tests
use mocked HTTP responses and temporary directories; they never publish releases
or send requests to a store.

## Coverage policy

V8 measures all application source, including files no test imports. Generated
UI primitives and type-only modules are excluded. Initial global thresholds
follow the measured baseline: 58% statements, 56% branches, 47% functions, and
60% lines. Core storage, import validation, sharing, and identity have stronger
95% statement/line/function and 90% branch gates. Paste and worker routing have
separate gates based on their measured coverage.

Browser tests are not included in the Vitest coverage numbers. A low percentage
on an options page does not imply it has no browser coverage, and a high unit
percentage does not prove browser correctness. Raise thresholds as meaningful
coverage grows; do not add assertions solely to execute lines.

## CI

`.github/workflows/ci.yml` runs on pull requests, pushes to `dev` and `master`, and manual
workflow dispatch. Independent jobs run:

1. Lint, formatting, application/test typechecking, and Vitest coverage.
2. Chrome build and the complete Chromium extension suite, including the fixed-behavior
   regression cases.
3. Chrome and Firefox builds and store-package validation.

CI uses the lockfile, Node 24 and pinned pnpm, a pnpm cache, read-only repository
permissions, timeouts, and cancellation of superseded runs. Coverage and browser
reports are retained for 14 days. Firefox packaging verifies compilation and
manifest generation; Firefox runtime behavior still needs separate testing.
The aggregate **Tests, lint, and builds** check preserves the existing required
check name. Release verification also runs typechecking, coverage, and Playwright
before packaging; publishing remains in its existing separate job.

Configure these jobs as required checks in repository branch protection if
merges must be blocked until they succeed.

## Previous regression suite

All original regression behaviors were migrated before removing the CommonJS
loader: label clearing → `editor.test.tsx`; clone title/collision, concurrent
writes, failed replacements → `storage.test.ts`; share validation →
`validation.test.ts`; keyboard → `keyboard.test.ts` and `picker.test.tsx`; focus
→ `observer.test.ts`; explicit save → `picker.test.tsx`; selector cancellation
→ `selector.test.ts`.

The later `dev` regressions were also migrated: field identity → `keys-paste`
and `observer`; editability/maxlength → `editability-length`, `selector`, and
`picker`; standalone native-browser scripts → `native-editing.spec.ts`; release
versioning and mocked GitHub/Chrome publication → `unit/release.test.ts`.
`pnpm test:browser` remains an alias for `pnpm test:e2e` for release compatibility.
