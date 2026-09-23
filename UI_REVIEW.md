# ClipJect UI review — 2026-09-23

## Scope and approach

Reviewed the toolbar popup, global snippet library, field library and detail views, inline editors, settings, theme controls, import/export dialogs, sharing preview, clone form, destructive confirmation, field selector banner, and Shadow DOM picker.

Kept React, Tailwind 4, Base UI/shadcn, Zustand, locally bundled Outfit, and the existing teal identity. Implementation followed the redesign-existing-projects, chrome-extensions, and React best-practice skills. Browser verification used installed Playwright with an isolated headless Edge profile because agent-browser was not installed.

## Utility-focused refinement

Following the design review, removed the marketing copy, decorative eyebrow headings, sidebar, large stat blocks, and rounded snippet cards. The library now uses top navigation, a compact filter/create toolbar, and aligned label/text/action rows. Character counts describe the actual snippet; Copy lets the library act as a working text tool. Field snippets are grouped into a page-and-field directory, settings use section rules, and the popup is more compact. Light, dark, and narrow layouts preserve the same hierarchy.

## Changes

- Shared brand, darker light-theme action color, clearer typography and spacing, responsive library navigation, consistent surfaces, reduced-motion support, and a skip link.
- Global and field search, result counts, useful empty states, readable multiline previews, and expandable long snippets.
- Always-visible row actions, named editor controls, explicit delete confirmation, draft-preserving save errors, and pending states.
- Popup guidance, enabled switch, readable counts, paused-state behavior, and visible unsupported-page errors.
- Larger picker with scope labels, two-line previews, labeled search/close controls, viewport clamping, loading/error/save feedback, and keyboard hints.
- Keyboard controls preserve native button activation, composition, and empty-result Enter behavior. Highlighted items stay visible.
- Field selection now confirms success and immediately focuses the selected field to open the picker.
- Settings separated into appearance, data, field mapping, and deletion; visible theme labels, accessible clone/share inputs, import pending states, clear deletion scope, and failure feedback.
- Fixed existing missing destination-title forwarding in the clone request; updated stale collision tests and added a regression test for the cross-context payload.

## Architecture and data

The shared brand lives in src/components/brand.tsx; page styles remain in src/index.css. The picker retains its isolated stylesheet in src/content/mount.ts. Feature components and existing Zustand stores remain in their original folders.

No storage migration, permission change, remote font, or external service was introduced. Storage stays at schema version 1 in chrome.storage.local. Existing snippet identity rules and password exclusion remain in place.

## Verification

- TypeScript project build and production Vite build.
- ESLint, including targeted allowances for existing shadcn variant/hook exports.
- 28 Node regression tests, including the new keyboard and clone forwarding cases.
- Real extension browser checks using only synthetic data: add/edit/search/copy, themes, 390px layout, popup toggle, select field, field snippet save/paste, button Enter activation, Escape, password exclusion, field details, clone to a new page/title, share import, backup export/import, and delete-all.
- Screenshots inspected for popup, library (light/dark/empty/narrow), settings, selector, picker, editor, field details, and confirmation dialogs. Local captures and verification harness are in .tmp-ui (gitignored).

Reload the unpacked dist extension to use the production build. The browser verification used Edge's Chromium extension runtime; Firefox and a broad matrix of third-party sites were not tested.
