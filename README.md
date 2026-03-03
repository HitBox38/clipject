# ClipJect

**ClipJect** is a browser extension that lets you save and paste text snippets into any input or textarea—scoped to a specific page or available globally.

- **Focus** an input or textarea on a webpage → a dropdown lists your saved snippets for that field (and global ones).
- **Click** a snippet to paste it (with proper `input`/`change` events for React/Vue forms).
- **Add** snippets per input (“Save current value”) or as global snippets usable anywhere.
- **Options** page to manage global snippets, browse per-input snippets, import/export, and clear data.

Data is stored only in `chrome.storage.local` (no cloud, no sync). No action on password fields.

---

## Supported browsers

- **Chrome** (Manifest V3)
- **Firefox** (Manifest V3–compatible; uses `browser`/`chrome` API abstraction)

---

## Tech stack

- **Vite** + **@crxjs/vite-plugin** for the extension build
- **TypeScript**, **React**, **Tailwind CSS**, **shadcn/ui**
- **Zustand** for UI state
- **Chrome storage API** (via a small `ext` wrapper for Chrome/Firefox)

---

## Development

### Prerequisites

- **Node.js** (v18+ recommended)
- **pnpm**

### Install and build

```bash
pnpm install
pnpm run build
```

The built extension is in the `**dist**` directory.

### Dev mode

```bash
pnpm dev
```

Runs Vite in watch mode and rebuilds the extension on file changes. Load or reload the `**dist**` folder in your browser (see below) to test.

### Other scripts

- `pnpm lint` — ESLint
- `pnpm preview` — Vite preview (for non-extension assets if needed)

---

## Adding the extension to your browser

Use the **unpacked** (development) build from the `**dist`** folder. After any `npm run build` or `npm run dev`, reload the extension in the browser to pick up changes.

### Chrome

1. Run `pnpm build` (or `pnpm dev`).
2. Open **chrome://extensions/**.
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked**.
5. Choose the project’s `**dist`** folder (e.g. `.../clipject/dist`).
6. The ClipJect icon should appear in the toolbar. Pin it if you like.
7. After code changes: run build/dev again, then click the **reload** icon on the extension card on `chrome://extensions`.

### Edge

1. Run `pnpm build` (or `pnpm dev`).
2. Open **edge://extensions/**.
3. Turn on **Developer mode** (bottom-left).
4. Click **Load unpacked**.
5. Select the `**dist`** folder.
6. To update: rebuild, then click **Reload** on the extension card.

### Firefox

1. Run `pnpm build` (or `pnpm dev`).
2. Open **about:debugging** in the address bar.
3. Click **This Firefox** (or **This Nightly**, etc.).
4. Click **Load Temporary Add-on…**.
5. In the file picker, go to your project and open the `**dist`** folder, then select the `**manifest.json**` file inside `dist` (e.g. `dist/manifest.json`).
6. The extension loads until you close Firefox or remove it. After code changes: rebuild, then in **about:debugging** click **Reload** on ClipJect.
  For a persistent install during development you can use **about:debugging** → **Load Temporary Add-on** and point at `dist/manifest.json` each session, or package the add-on and install the `.xpi` for a permanent development install.

---

## Project structure (high level)

- `**src/content/`** — Content script: field detection, picker UI, snippet paste.
- `**src/options/**` — Options page: global snippets, per-input snippets, settings, import/export, danger zone.
- `**src/popup/**` — Popup: enable/disable, link to options.
- `**src/background/**` — Service worker (minimal; ready for future messaging).
- `**src/lib/**` — Storage, paste, keys, extension API wrapper (`ext`), sharing, validation.
- `**src/components/**` — Shared UI (theme switcher, shadcn components).
- `**manifest.json**` — Extension manifest (MV3).

For full product and architecture details, see **AGENTS.md**.
