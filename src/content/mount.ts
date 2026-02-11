/**
 * Creates and manages the Shadow DOM host for the ClipJect picker.
 *
 * The picker lives inside a shadow root attached to a <div> appended to
 * document.body.  This isolates our styles from the host page (and vice versa).
 */

import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { Picker } from "./picker";
import type { PickerProps } from "./picker/types";
import { PICKER_Z_INDEX } from "@/lib/constants";
import { initPickerTheme } from "./theme-bridge";

// Vite resolves these to hashed asset URLs at build time.
// In the crxjs content-script context they become chrome-extension:// URLs.
import outfitLatinUrl from "@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url";
import outfitLatinExtUrl from "@fontsource-variable/outfit/files/outfit-latin-ext-wght-normal.woff2?url";

const HOST_ID = "clipject-picker-host";

let shadowHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let reactRoot: Root | null = null;
let cleanupTheme: (() => void) | null = null;

function injectStyles(shadow: ShadowRoot): void {
  const style = document.createElement("style");
  style.textContent = getPickerCSS();
  shadow.appendChild(style);
}

function ensureHost(): { shadow: ShadowRoot; container: HTMLDivElement } {
  if (shadowHost && shadowRoot) {
    const container = shadowRoot.querySelector(
      "#clipject-root",
    ) as HTMLDivElement;
    return { shadow: shadowRoot, container };
  }

  shadowHost = document.createElement("div");
  shadowHost.id = HOST_ID;
  shadowHost.style.position = "fixed";
  shadowHost.style.top = "0";
  shadowHost.style.left = "0";
  shadowHost.style.width = "0";
  shadowHost.style.height = "0";
  shadowHost.style.overflow = "visible";
  shadowHost.style.zIndex = String(PICKER_Z_INDEX);
  shadowHost.style.pointerEvents = "none";

  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  injectStyles(shadowRoot);

  const container = document.createElement("div");
  container.id = "clipject-root";
  shadowRoot.appendChild(container);

  document.body.appendChild(shadowHost);

  // Theme tracking: toggle .dark on the container inside the shadow root.
  cleanupTheme = initPickerTheme(container);

  return { shadow: shadowRoot, container };
}

export function mountPicker(props: PickerProps): void {
  const { container } = ensureHost();

  if (reactRoot) {
    reactRoot.render(createElement(Picker, props));
    return;
  }

  reactRoot = createRoot(container);
  reactRoot.render(createElement(Picker, props));
}

export function unmountPicker(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (cleanupTheme) {
    cleanupTheme();
    cleanupTheme = null;
  }
  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
    shadowRoot = null;
  }
}

// ---------------------------------------------------------------------------
// Scoped CSS for the picker.
//
// Faithfully reproduces the shadcn/ui design system used across the
// extension's Popup and Options pages.  Every button variant, input style,
// spacing value, and color token is pixel-matched to the Tailwind/shadcn
// output so the picker feels like a natural part of the app.
//
// The stylesheet is split into:
//   1. @font-face + @keyframes
//   2. Design tokens (light / dark)
//   3. Reset
//   4. Reusable primitives (buttons, inputs, separators, labels)
//   5. Picker layout (header, search, list, items, footer, form, resize)
// ---------------------------------------------------------------------------

function getPickerCSS(): string {
  return /* css */ `

    /* ==================================================================
       1.  @font-face  +  @keyframes
    ================================================================== */

    @font-face {
      font-family: 'Outfit Variable';
      font-style: normal;
      font-display: swap;
      font-weight: 100 900;
      src: url('${outfitLatinExtUrl}') format('woff2-variations');
      unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
    }

    @font-face {
      font-family: 'Outfit Variable';
      font-style: normal;
      font-display: swap;
      font-weight: 100 900;
      src: url('${outfitLatinUrl}') format('woff2-variations');
      unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }

    @keyframes cj-fade-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ==================================================================
       2.  Design tokens  (mirrored 1-to-1 from src/index.css)
    ================================================================== */

    #clipject-root {
      --cj-background:   oklch(1 0 0);
      --cj-foreground:   oklch(0.141 0.005 285.823);
      --cj-popover:      oklch(1 0 0);
      --cj-popover-fg:   oklch(0.141 0.005 285.823);
      --cj-primary:      oklch(0.60 0.10 185);
      --cj-primary-fg:   oklch(0.98 0.01 181);
      --cj-secondary:    oklch(0.967 0.001 286.375);
      --cj-secondary-fg: oklch(0.21 0.006 285.885);
      --cj-muted:        oklch(0.967 0.001 286.375);
      --cj-muted-fg:     oklch(0.552 0.016 285.938);
      --cj-border:       oklch(0.92 0.004 286.32);
      --cj-input:        oklch(0.92 0.004 286.32);
      --cj-ring:         oklch(0.705 0.015 286.067);
      --cj-radius:       0.625rem;
    }

    #clipject-root.dark {
      --cj-background:   oklch(0.141 0.005 285.823);
      --cj-foreground:   oklch(0.985 0 0);
      --cj-popover:      oklch(0.21 0.006 285.885);
      --cj-popover-fg:   oklch(0.985 0 0);
      --cj-primary:      oklch(0.70 0.12 183);
      --cj-primary-fg:   oklch(0.28 0.04 193);
      --cj-secondary:    oklch(0.274 0.006 286.033);
      --cj-secondary-fg: oklch(0.985 0 0);
      --cj-muted:        oklch(0.274 0.006 286.033);
      --cj-muted-fg:     oklch(0.705 0.015 286.067);
      --cj-border:       oklch(1 0 0 / 10%);
      --cj-input:        oklch(1 0 0 / 15%);
      --cj-ring:         oklch(0.552 0.016 285.938);
    }

    /* ==================================================================
       3.  Reset
    ================================================================== */

    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ==================================================================
       4a.  Separator  (matches shadcn Separator)
    ================================================================== */

    .cj-separator {
      height: 1px;
      width: 100%;
      background: var(--cj-border);
      flex-shrink: 0;
    }

    /* ==================================================================
       4b.  Button system  (matches shadcn Button exactly)

       Size tokens:
         xs  →  h-6  (24px), text-xs (12px), rounded 8px, px-2 (8px)
         sm  →  h-7  (28px), text-[0.8rem] (12.8px), rounded 8px, px-2.5 (10px)
    ================================================================== */

    .cj-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      font-weight: 500;
      font-family: inherit;
      border: 1px solid transparent;
      cursor: pointer;
      outline: none;
      user-select: none;
      -webkit-user-select: none;
      transition: all 0.15s;
    }

    .cj-btn svg {
      pointer-events: none;
      flex-shrink: 0;
    }

    .cj-btn:disabled {
      opacity: 0.5;
      pointer-events: none;
      cursor: not-allowed;
    }

    .cj-btn:focus-visible {
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--cj-ring) 50%, transparent);
      border-color: var(--cj-ring);
    }

    /* --- sizes --- */

    .cj-btn--xs {
      height: 24px;
      gap: 4px;
      padding: 0 8px;
      font-size: 12px;
      border-radius: 8px;
    }

    .cj-btn--xs svg { width: 12px; height: 12px; }

    .cj-btn--sm {
      height: 28px;
      gap: 4px;
      padding: 0 10px;
      font-size: 12.8px;
      border-radius: 8px;
    }

    .cj-btn--sm svg { width: 14px; height: 14px; }

    .cj-btn--icon-xs {
      width: 24px;
      height: 24px;
      padding: 0;
      border-radius: 8px;
    }

    .cj-btn--icon-xs svg { width: 12px; height: 12px; }

    /* --- variants --- */

    .cj-btn--default {
      background: var(--cj-primary);
      color: var(--cj-primary-fg);
    }

    .cj-btn--outline {
      border-color: var(--cj-border);
      background: transparent;
      color: var(--cj-popover-fg);
    }

    .cj-btn--outline:hover {
      background: var(--cj-muted);
      color: var(--cj-popover-fg);
    }

    .cj-btn--secondary {
      background: var(--cj-secondary);
      color: var(--cj-secondary-fg);
    }

    .cj-btn--secondary:hover {
      background: color-mix(in oklch, var(--cj-secondary) 80%, transparent);
    }

    .cj-btn--ghost {
      background: transparent;
      color: var(--cj-popover-fg);
    }

    .cj-btn--ghost:hover {
      background: var(--cj-muted);
    }

    /* dark-mode outline button: subtle fill like shadcn dark:bg-input/30 */
    .dark .cj-btn--outline {
      background: color-mix(in oklch, var(--cj-input) 30%, transparent);
      border-color: var(--cj-input);
    }

    .dark .cj-btn--outline:hover {
      background: color-mix(in oklch, var(--cj-input) 50%, transparent);
    }

    /* ==================================================================
       4c.  Input  (matches shadcn Input — h-8, rounded-lg)
    ================================================================== */

    .cj-input {
      width: 100%;
      height: 32px;
      background: transparent;
      border: 1px solid var(--cj-input);
      border-radius: var(--cj-radius);
      padding: 4px 10px;
      font-size: 13px;
      font-family: inherit;
      color: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .cj-input:focus {
      border-color: var(--cj-ring);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--cj-ring) 50%, transparent);
    }

    .cj-input::placeholder { color: var(--cj-muted-fg); }

    .dark .cj-input {
      background: color-mix(in oklch, var(--cj-input) 30%, transparent);
    }

    /* ==================================================================
       4d.  Textarea  (matches shadcn Textarea — rounded-lg, min-h-16)
    ================================================================== */

    .cj-textarea {
      width: 100%;
      min-height: 64px;
      background: transparent;
      border: 1px solid var(--cj-input);
      border-radius: var(--cj-radius);
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      color: inherit;
      outline: none;
      resize: vertical;
      transition: border-color 0.15s, box-shadow 0.15s;
      field-sizing: content;
    }

    .cj-textarea:focus {
      border-color: var(--cj-ring);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--cj-ring) 50%, transparent);
    }

    .cj-textarea::placeholder { color: var(--cj-muted-fg); }

    .dark .cj-textarea {
      background: color-mix(in oklch, var(--cj-input) 30%, transparent);
    }

    /* ==================================================================
       4e.  Label  (matches shadcn Label — text-sm, font-medium)
    ================================================================== */

    .cj-label {
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      color: var(--cj-popover-fg);
    }

    /* ==================================================================
       4f.  Field wrapper  (label + input group, gap-1.5 = 6px)
    ================================================================== */

    .cj-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ==================================================================
       5a.  Picker container
    ================================================================== */

    .clipject-picker {
      position: fixed;
      pointer-events: auto;
      font-family: 'Outfit Variable', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: var(--cj-popover-fg);
      background: var(--cj-popover);
      border-radius: calc(var(--cj-radius) + 4px);          /* rounded-xl = 14px */
      box-shadow:
        0 0 0 1px color-mix(in oklch, var(--cj-foreground) 10%, transparent),
        0 4px 6px -1px rgb(0 0 0 / 0.1),
        0 2px 4px -2px rgb(0 0 0 / 0.1);
      width: 280px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: ${PICKER_Z_INDEX};
      animation: cj-fade-in 0.15s ease-out;
    }

    /* ==================================================================
       5b.  Header  (matches popup header pattern)
    ================================================================== */

    .clipject-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      flex-shrink: 0;
    }

    .clipject-title {
      font-size: 13px;
      font-weight: 600;
    }

    /* ==================================================================
       5c.  Search
    ================================================================== */

    .clipject-search {
      padding: 0 8px 8px;
      flex-shrink: 0;
    }

    .clipject-search-wrap {
      position: relative;
    }

    .clipject-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--cj-muted-fg);
      pointer-events: none;
    }

    .clipject-search .cj-input {
      padding-left: 30px;
    }

    /* ==================================================================
       5d.  Snippet list
    ================================================================== */

    .clipject-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px;
    }

    .clipject-section-label {
      padding: 6px 8px 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--cj-muted-fg);
    }

    /* ==================================================================
       5e.  Snippet item  (stacked label/value, matches options rows)
    ================================================================== */

    .clipject-item {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 7px 8px;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      color: var(--cj-popover-fg);
      font-family: inherit;
      border-radius: calc(var(--cj-radius) - 4px);
      transition: background 0.12s ease;
    }

    .clipject-item:hover,
    .clipject-item.highlighted {
      background: var(--cj-muted);
    }

    .clipject-item-label {
      font-size: 13px;
      font-weight: 500;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .clipject-item-value {
      font-size: 12px;
      line-height: 1.3;
      color: var(--cj-muted-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* value-only items (no label) use slightly larger text */
    .clipject-item-value:only-child {
      font-size: 13px;
    }

    .clipject-empty {
      padding: 24px 16px;
      text-align: center;
      color: var(--cj-muted-fg);
      font-size: 13px;
    }

    /* ==================================================================
       5f.  Footer
    ================================================================== */

    .clipject-footer {
      padding: 8px;
      display: flex;
      gap: 6px;
    }

    .clipject-footer .cj-btn { flex: 1; }

    /* ==================================================================
       5g.  Add-snippet form
    ================================================================== */

    .clipject-form {
      padding: 8px 12px 4px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .clipject-form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .clipject-scope {
      display: flex;
      gap: 4px;
    }

    .clipject-form-actions {
      display: flex;
      gap: 4px;
    }

    /* ==================================================================
       5h.  Resize handle
    ================================================================== */

    .clipject-resize-handle {
      height: 12px;
      cursor: row-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    .clipject-resize-handle::after {
      content: '';
      width: 32px;
      height: 3px;
      border-radius: 2px;
      background: var(--cj-border);
      transition: background 0.15s;
    }

    .clipject-resize-handle:hover::after {
      background: var(--cj-muted-fg);
    }

    /* ==================================================================
       5i.  Scrollbar
    ================================================================== */

    .clipject-list::-webkit-scrollbar { width: 6px; }
    .clipject-list::-webkit-scrollbar-track { background: transparent; }

    .clipject-list::-webkit-scrollbar-thumb {
      background: color-mix(in oklch, var(--cj-muted-fg) 35%, transparent);
      border-radius: 3px;
    }

    .clipject-list::-webkit-scrollbar-thumb:hover {
      background: var(--cj-muted-fg);
    }
  `;
}
