# Testing ClipJect

Use Node 22.16.0 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
```

On Linux, use `pnpm exec playwright install --with-deps chromium` to install
browser system dependencies too. Browser tests start their own local fixture
server on port 4173; leave that port free.

## Commands

| Command              | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `pnpm test`          | Run all Vitest unit and DOM tests once                      |
| `pnpm test:watch`    | Watch tests during development                              |
| `pnpm test:coverage` | Run Vitest with coverage gates and HTML/LCOV reports        |
| `pnpm test:e2e`      | Build the Chrome extension and run Playwright               |
| `pnpm test:e2e:ui`   | Build and open the Playwright test UI                       |
| `pnpm typecheck`     | Check application, tests, fixtures, and test configurations |
| `pnpm check`         | Lint, typecheck, coverage, browser tests, and Firefox build |

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

## Existing browser defects

`known-regressions.spec.ts` contains executable desired-behavior tests for the
six defects documented during the September 28 QA session. These are **expected
failures**, not passing product behavior and not skipped tests:

| ID    | Desired behavior                              | Current defect                         |
| ----- | --------------------------------------------- | -------------------------------------- |
| QA-01 | Enter preserves a textarea draft              | Picker intercepts Enter                |
| QA-02 | Undo restores the replaced draft              | Native setter bypasses undo history    |
| QA-03 | Readonly fields offer no insertion            | Supported-field check accepts them     |
| QA-04 | Repeated names retain separate field snippets | Name-only identity collides            |
| QA-05 | Insertion respects maxlength                  | Programmatic setter bypasses the limit |
| QA-06 | Picker in a native modal accepts clicks       | Picker sits below the top layer        |

The expected-failure annotation is applied only after fixture setup succeeds.
When fixing a defect, remove its annotation and make the desired-behavior test
pass. Unexpected passes fail the run so stale annotations cannot silently remain.
Do not use expected failures for new unexplained failures. This testing upgrade
does not change those product behaviors.

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

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual
workflow dispatch. Independent jobs run:

1. Lint, application/test typechecking, and Vitest coverage.
2. Chrome build and the complete Chromium extension suite, including the visible
   expected-failure reproductions.
3. Firefox production packaging.

CI uses the lockfile, pinned Node/pnpm, a pnpm cache, read-only repository
permissions, timeouts, and cancellation of superseded runs. Coverage and browser
reports are retained for 14 days. Firefox packaging verifies compilation and
manifest generation; Firefox runtime behavior still needs separate testing.

Configure these jobs as required checks in repository branch protection if
merges must be blocked until they succeed.

## Previous regression suite

All original regression behaviors were migrated before removing the CommonJS
loader: label clearing → `editor.test.tsx`; clone title/collision, concurrent
writes, failed replacements → `storage.test.ts`; share validation →
`validation.test.ts`; keyboard → `keyboard.test.ts` and `picker.test.tsx`; focus
→ `observer.test.ts`; explicit save → `picker.test.tsx`; selector cancellation
→ `selector.test.ts`.
