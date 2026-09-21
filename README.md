# ClipJect

ClipJect is a local-first browser extension for saving and reusing text in web
forms. Choose the fields you want to track, then focus a tracked field to open a
searchable snippet picker. Save snippets for that field and page, or keep global
snippets available across all tracked fields.

The primary target is Chrome with Manifest V3. The extension manifest is at
**0.1.0**; this is an early-stage project developed and loaded from source.

## Features

- **Explicit field tracking:** use **Select Element** in the toolbar popup to
  register an input or textarea. Fields with existing per-input snippets are
  also recognized automatically.
- **Searchable picker:** see per-input snippets first, then global snippets.
  Search labels and text, navigate with the keyboard, and resize the picker.
- **Paste into forms:** selecting a snippet replaces the field's entire value
  using its native setter and dispatches bubbling `input` and `change` events.
  It does not insert at the cursor or submit the form.
- **Explicit saving:** **Save current** saves the field's current nonempty value
  as a per-input snippet. **+ Add new** accepts text, an optional label, and a
  choice of per-input or global scope.
- **Snippet management:** Options supports adding global snippets, browsing
  per-input snippets by page, editing labels and values, and deleting snippets
  or whole input entries.
- **Manual transfers:** export/import a JSON backup, or copy a per-input snippet
  as a share string and preview it before importing elsewhere.
- **Preferences:** enable/disable the extension from the popup and choose light,
  dark, or system themes. The popup shows snippet and tracking counts.
- **Cloning:** Settings includes a form for copying an input's snippets to
  another origin, path, page title, and optional input signature. This flow has
  a current integration blocker described below.

## Current project status

The ten initial review fixes have been merged. Verification of combined `master`
at `2780c79` found a remaining integration problem:

- **Production build is blocked:** `cloneInputEntry` accepts a destination title,
  but its background-message argument list omits that title. TypeScript reports
  `TS2322` in [src/lib/storage.ts](src/lib/storage.ts). The request must include
  the title before the optional input signature for cloning through Options to
  work correctly.
- **Regression tests:** 22 of 24 pass. The two tests in
  [tests/clone-collision.test.cjs](tests/clone-collision.test.cjs) still call the
  old clone signature and need the explicit destination title.

The commands below describe the development workflow. A successful production
build requires resolving that blocker first.

## Using ClipJect

1. Load the extension using the setup instructions below and open a regular
   webpage containing a form.
2. Open the ClipJect toolbar popup, ensure it is **Enabled**, and click
   **Select Element**.
3. Click the input or textarea to track. Press **Esc** or click **Cancel** to
   leave selection mode without registering a field.
4. Focus the tracked field to open its picker. If necessary, focus another
   element and then return to the field.
5. Use **Save current** or **+ Add new** to create a snippet. Click a snippet to
   paste it into the field.
6. Use **Open Options** in the popup to manage saved data and preferences.

While browsing the picker, **Up/Down** moves the highlight, **Enter** selects the
highlighted snippet, and **Esc** closes the picker. Navigation shortcuts are
disabled while the add-snippet form is open so normal text editing works.

Global snippets do not make the picker appear on every input automatically: the
field must still be tracked.

## Data, backups, and privacy

Snippets, field registrations, and preferences live in the extension's
`storage.local`. There is no account, backend, telemetry, cloud sync, or automatic
upload. Saving field text requires an explicit action; password fields are
excluded.

Saved snippets and JSON exports have no application-level encryption. Share
strings encode snippet text and page/input metadata; encoding is not encryption.
Copying or exporting data makes it available wherever you choose to paste or
save it.

In **Options → Settings**:

- **Export data** downloads a versioned JSON file containing global snippets,
  per-input entries, and tracked inputs. Theme and enabled/disabled preferences
  are excluded.
- **Merge** adds imported data, skipping snippet IDs already present in the
  corresponding collection and deduplicating tracked fields by fingerprint. It
  does not update an existing snippet's text simply because its ID matches.
- **Replace** overwrites all snippet and tracking collections after confirmation,
  using one storage write without deleting the old data first.
- **Import shared snippet** accepts a `clipject:share:v1:` string, shows a preview,
  and imports the snippet with a fresh ID.
- **Delete all data** removes snippets and tracked inputs while retaining theme
  and enabled/disabled preferences.

### Field identity

Per-input snippets use this composite key:

```text
{origin}{pathname}::{page title}::{input signature}
```

The input signature uses the first available attribute in this order: `id`,
`name`, `aria-label`, `placeholder`, then a DOM path with `nth-of-type` where
needed. Query strings and URL fragments are not part of the key.

Tracking fingerprints omit the page title:

```text
{origin}{pathname}::{input signature}
```

A title change can therefore leave a field tracked while showing a different set
of per-input snippets. Fields with the same selected identifying attribute can
share an identity, and a DOM path can change when a site changes its layout.

## Browser support and limitations

- **Chrome:** primary Manifest V3 target, loaded as an unpacked extension for
  local development.
- **Edge:** uses the same unpacked Chromium installation workflow; separate
  browser verification is still needed.
- **Firefox:** a future compatibility target. The `browser`/`chrome` API wrapper
  is a starting point, not a verified Firefox build or installation path.
- Supported fields are native `textarea` elements and input types other than
  password, hidden, file, image, submit, reset, button, checkbox, radio, range,
  and color. Typed inputs such as number or date still enforce browser rules.
- Rich-text/contenteditable editors, fields inside shadow roots, and fields in
  child frames are not supported by the current field-detection flow.
- Browser-internal and other restricted pages cannot run the content script.
- SPA navigation handling observes title changes, `popstate`, and `hashchange`;
  it does not intercept every `history.pushState` or `replaceState` call.
- There is no dedicated UI to untrack one field. Deleting its saved snippets does
  not remove an explicit registration.

## Development

### Prerequisites

- Node.js **22.12+** recommended. Vite 7 requires Node `^20.19.0 || >=22.12.0`.
- pnpm, using the checked-in `pnpm-lock.yaml`.

### Install and build

```sh
pnpm install --frozen-lockfile
pnpm run build
```

The build runs TypeScript checking followed by Vite and writes the extension to
`dist/`. See the current build blocker above before troubleshooting installation.

### Load in Chrome or Edge

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the generated `dist/` directory.
4. Pin ClipJect in the toolbar for easy access to **Select Element**.
5. After rebuilding, reload the extension and refresh the webpage you are testing
   so its content script is updated.

### Development server

```sh
pnpm run dev
```

Vite and CRXJS provide extension development with hot updates. Load the generated
`dist/` directory as an unpacked extension and keep the dev server running.
Manifest and content-script changes may require an extension reload and page
refresh. Use a production build for an installation independent of the dev server.

### Verification

```sh
pnpm run build
pnpm run lint
node --test tests/*.test.cjs
```

Regression tests use Node's built-in test runner, TypeScript transpilation, and
mocked extension/DOM contexts. There is no `pnpm test` script. These tests do not
replace checks in a real browser.

For a manual smoke test, register a field on a basic form, save both snippet
scopes, paste into a framework-controlled field, test search and keyboard
navigation, move between tracked and untracked fields, and verify that password
fields are ignored. Also check scrolling/resizing, SPA title/path changes, and
backup import/export.

`pnpm run preview` serves built assets; it does not simulate the extension runtime
or replace loading the unpacked extension.

## Architecture

The stack is Vite 7 with CRXJS, TypeScript, React 19, Tailwind CSS 4, shadcn/ui
components, and Zustand. Zustand manages UI state; extension storage provides
persistence across browser contexts.

| Location          | Responsibility                                                                       |
| ----------------- | ------------------------------------------------------------------------------------ |
| `src/content/`    | Field selection/tracking, focus observation, and a React picker inside a shadow root |
| `src/popup/`      | Enable toggle, counts, Select Element, and Options link                              |
| `src/options/`    | Snippet management, themes, transfers, cloning, and data deletion                    |
| `src/background/` | Service worker initialization and a serialized storage-mutation queue                |
| `src/lib/`        | Storage, messaging, identity, native value setting, sharing, and import validation   |
| `src/types/`      | Storage and extension-message types                                                  |
| `src/components/` | Shared UI components and theme handling                                              |
| `tests/`          | Regression tests and source-loading/mock-storage helpers                             |
| `manifest.json`   | Manifest V3 entry points and permissions                                             |

Content scripts and extension pages send mutations to the background worker,
which processes them sequentially to avoid competing read/modify/write operations
losing updates. Reads use local storage; storage-change listeners refresh relevant
UI and tracking state.

### Permissions

- `storage`: persist snippets, tracked fields, and preferences locally.
- `activeTab`: support user-initiated element selection on the active tab.
- `scripting`: inject the content script when the popup cannot reach it in an
  already-open tab.
- Content-script matching on `<all_urls>`: detect tracked fields across eligible
  webpages. This is broad page coverage, even though the picker only opens for
  tracked fields.

### Storage schema

| Key                          | Contents                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| `clipject:perInputDb:v1`     | Entries keyed by page and input identity, with metadata and snippets |
| `clipject:globalSnippets:v1` | Global snippets                                                      |
| `clipject:trackedInputs:v1`  | Explicit field registrations                                         |
| `clipject:enabled:v1`        | Enable/disable preference                                            |
| `clipject:theme:v1`          | Light, dark, or system preference                                    |

Snippets include an ID, value, optional label, and creation/update timestamps.
Per-input entries also contain page metadata and the input signature, tag, type,
and last-seen timestamp. Export envelopes use schema version 1. There is no
implemented migration pipeline for future schema versions yet.

See [AGENTS.md](AGENTS.md) for repository conventions and the original product
requirements.
