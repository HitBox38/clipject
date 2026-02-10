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
// Scoped CSS for the picker — no Tailwind here, everything is hand-rolled
// so it can't clash with the host page.
// ---------------------------------------------------------------------------

function getPickerCSS(): string {
  return /* css */ `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .clipject-picker {
      position: fixed;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #1a1a1a;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12),
                  0 1px 4px rgba(0, 0, 0, 0.08);
      width: 280px;
      max-height: 320px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: ${PICKER_Z_INDEX};
    }

    .clipject-picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
      font-weight: 600;
      font-size: 12px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .clipject-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #999;
      font-size: 16px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .clipject-close-btn:hover {
      background: #f5f5f5;
      color: #333;
    }

    .clipject-section-label {
      padding: 6px 12px 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #999;
    }

    .clipject-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .clipject-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-size: 13px;
      color: #1a1a1a;
      gap: 8px;
    }

    .clipject-item:hover,
    .clipject-item.highlighted {
      background: #f0f7ff;
    }

    .clipject-item-label {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
      max-width: 100px;
    }

    .clipject-item-value {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #666;
      flex: 1;
      min-width: 0;
    }

    .clipject-empty {
      padding: 16px 12px;
      text-align: center;
      color: #999;
      font-size: 12px;
    }

    .clipject-footer {
      border-top: 1px solid #f0f0f0;
      padding: 6px 8px;
      display: flex;
      gap: 4px;
    }

    .clipject-footer-btn {
      flex: 1;
      background: none;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 11px;
      cursor: pointer;
      color: #444;
      text-align: center;
    }

    .clipject-footer-btn:hover {
      background: #f5f5f5;
      border-color: #ccc;
    }

    .clipject-footer-btn.primary {
      background: #33a89e;
      color: #fff;
      border-color: #33a89e;
    }

    .clipject-footer-btn.primary:hover {
      background: #2b9389;
    }

    .clipject-add-form {
      padding: 8px 12px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .clipject-add-form textarea {
      width: 100%;
      min-height: 48px;
      resize: vertical;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
    }

    .clipject-add-form textarea:focus {
      border-color: #33a89e;
      box-shadow: 0 0 0 2px rgba(51, 168, 158, 0.15);
    }

    .clipject-add-form input[type="text"] {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
    }

    .clipject-add-form input[type="text"]:focus {
      border-color: #33a89e;
      box-shadow: 0 0 0 2px rgba(51, 168, 158, 0.15);
    }

    .clipject-add-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .clipject-scope-toggle {
      display: flex;
      gap: 0;
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
      font-size: 11px;
    }

    .clipject-scope-btn {
      border: none;
      background: #fff;
      padding: 4px 8px;
      cursor: pointer;
      color: #666;
    }

    .clipject-scope-btn.active {
      background: #33a89e;
      color: #fff;
    }

    /* ---------------------------------------------------------------
       Dark mode — scoped to .dark on #clipject-root
    --------------------------------------------------------------- */

    .dark .clipject-picker {
      color: #e5e5ea;
      background: #1c1c1e;
      border-color: #38383a;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4),
                  0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .dark .clipject-picker-header {
      border-bottom-color: #2c2c2e;
      color: #8e8e93;
    }

    .dark .clipject-close-btn {
      color: #8e8e93;
    }

    .dark .clipject-close-btn:hover {
      background: #2c2c2e;
      color: #e5e5ea;
    }

    .dark .clipject-section-label {
      color: #8e8e93;
    }

    .dark .clipject-item {
      color: #e5e5ea;
    }

    .dark .clipject-item:hover,
    .dark .clipject-item.highlighted {
      background: #2c2c2e;
    }

    .dark .clipject-item-value {
      color: #8e8e93;
    }

    .dark .clipject-empty {
      color: #8e8e93;
    }

    .dark .clipject-footer {
      border-top-color: #2c2c2e;
    }

    .dark .clipject-footer-btn {
      border-color: #38383a;
      color: #e5e5ea;
    }

    .dark .clipject-footer-btn:hover {
      background: #2c2c2e;
      border-color: #48484a;
    }

    .dark .clipject-footer-btn.primary {
      background: #33a89e;
      color: #fff;
      border-color: #33a89e;
    }

    .dark .clipject-footer-btn.primary:hover {
      background: #2b9389;
    }

    .dark .clipject-add-form {
      border-top-color: #2c2c2e;
    }

    .dark .clipject-add-form textarea {
      background: #2c2c2e;
      border-color: #38383a;
      color: #e5e5ea;
    }

    .dark .clipject-add-form textarea:focus {
      border-color: #33a89e;
      box-shadow: 0 0 0 2px rgba(51, 168, 158, 0.25);
    }

    .dark .clipject-add-form input[type="text"] {
      background: #2c2c2e;
      border-color: #38383a;
      color: #e5e5ea;
    }

    .dark .clipject-add-form input[type="text"]:focus {
      border-color: #33a89e;
      box-shadow: 0 0 0 2px rgba(51, 168, 158, 0.25);
    }

    .dark .clipject-scope-toggle {
      border-color: #38383a;
    }

    .dark .clipject-scope-btn {
      background: #1c1c1e;
      color: #8e8e93;
    }

    .dark .clipject-scope-btn.active {
      background: #33a89e;
      color: #fff;
    }
  `;
}
