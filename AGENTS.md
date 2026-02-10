# AGENTS.md — ClipJect (Cursor)

This repository is a browser extension called “ClipJect”.
Your job (as Cursor agents) is to help plan and implement it with high reliability,
clean TypeScript, and an extension-appropriate architecture.

## Product summary

ClipJect lets a user:

1) Focus an input/textarea on a webpage
2) See a dropdown listing saved snippets for that specific input (scoped to page)
3) Paste a snippet into the field with one click
4) Add new snippets for that input
5) Also maintain a list of Global Snippets available for any input anywhere

Primary target: Chrome Manifest V3.
Secondary target later: Firefox (design with compatibility in mind).

## Stack (required)

- Vite
- TypeScript
- React
- Tailwind CSS
- shadcn/ui (primarily for extension pages like Options/Popup)
- Zustand (UI state; do not confuse with cross-context persistence)

Recommended tooling:

- @crxjs/vite-plugin for MV3 build/dev

## Core requirements (MVP)

### Keying / identity rules

- Page key must be: origin + pathname + page title
  - Example: `${origin}${pathname}::${title}`
- Input identity:
  - Use stable attributes first: id, name, aria-label, placeholder
  - If none are present, use a DOM path fallback (nth-of-type chain)
- Snippets:
  - Per-input snippets (scoped by page key + input signature)
  - Global snippets (available anywhere)

### UX requirements

- When a supported field is focused/clicked:
  - Show a small anchored dropdown near the field
  - List per-input snippets first, then global snippets
  - Clicking a snippet pastes it and fires `input` + `change` events
- Allow adding snippets:
  - “Save current field value” -> per-input snippets
  - “Add new snippet” with text input (choose per-input or global)
- Do NOT operate on password fields.
- The UI should be keyboard-friendly (at least Esc to close; arrow keys are a plus).

### Persistence

- Use `chrome.storage.local` only (no network, no remote sync) for MVP.
- Store:
  - Per-input DB (record keyed as specified)
  - Global snippet list
- Include metadata: createdAt/updatedAt, titleLastSeen, etc.

## Non-goals (for MVP)

- No cloud sync
- No automatic scraping of page content
- No attempting to bypass CSP
- No advanced autofill heuristics for complex editors (contenteditable) unless added later

## Security & privacy (hospital environment)

- Treat all saved snippets as potentially sensitive.
- Never transmit data off-device.
- Make saving explicit (user action).
- Avoid reading values unless necessary for “Save current value”.
- Consider adding an allowlist of domains/hostnames later (nice-to-have).
- Add an easy “Delete all data” control in Options.

## Architecture guidelines

### Extension contexts

- Content script:
  - Detect focus on fields
  - Compute keys/signatures
  - Display the picker overlay
  - Read/write chrome.storage.local
- Options page (React + shadcn/ui):
  - Manage global snippets
  - Browse/edit per-input snippets
  - Clear data
- Popup page (optional):
  - Quick enable/disable toggle and link to Options
  - Keep minimal; popup closes on blur

### Styling notes

- Prefer shadcn/ui for Options/Popup.
- For in-page overlay:
  - Prefer a lightweight custom UI or a Shadow DOM host to avoid CSS conflicts.
  - Avoid Radix portal components unless you explicitly control the container.

### Browser compatibility abstraction

Create a tiny wrapper:

- `const ext = globalThis.browser ?? globalThis.chrome;`
- Use `ext.storage.local` etc.
This reduces later Firefox friction.

## Data model (suggested)

- `clipject:perInputDb:v1` -> Record<string, InputEntry>
  - key: `${origin}${pathname}::${title}::${inputSignature}`
- `clipject:globalSnippets:v1` -> Array<{ id, label?, value, createdAt, updatedAt }>

InputEntry should include:

- page: { origin, pathname, titleLastSeen }
- input: { signature, tag, type?, lastSeenAt }
- snippets: Array<{ id, value, createdAt, updatedAt }>

## Coding conventions

- TypeScript strict
- Small pure helpers for:
  - pageKey computation
  - input signature computation
  - DOM-path fallback
  - setNativeValue (dispatch input/change)
- Prefer `async/await`
- Keep React components small; state in Zustand where appropriate
- No HTML in markdown outputs
- Use Prettier (80 char print width)

## Deliverables expected from Cursor

1) A clear implementation plan broken into milestones
2) File/folder structure proposal
3) Manifest + permissions rationale
4) Storage schema and migration/versioning approach
5) A minimal working vertical slice:
   - focus field -> dropdown -> paste
   - add per-input snippet
   - add global snippet
   - options page to edit/delete

## Testing checklist (manual)

- Works on a basic HTML form page
- Works on common SPAs (title changes? path changes?)
- Esc closes picker
- Scroll/resize keeps picker positioned or closes safely
- No action on password inputs
- Snippet paste triggers frameworks listening to input events (React/Vue forms)
