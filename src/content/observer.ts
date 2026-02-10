/**
 * Observes focus events on input/textarea elements across the page.
 *
 * When a supported field receives focus:
 *  1. Compute the page key + input signature
 *  2. Mount (or re-mount) the picker dropdown
 *
 * When focus leaves all tracked elements, unmount the picker.
 *
 * Also watches for SPA navigation (popstate, hashchange, title changes)
 * and re-computes keys / closes the picker when the page context changes.
 */

import {
  buildCompositeKey,
  buildInputMeta,
  computeInputSignature,
  computePageKey,
  isPasswordField,
  isSupportedField,
} from "@/lib/keys";
import { FOCUS_DEBOUNCE_MS, STORAGE_KEY_ENABLED } from "@/lib/constants";
import { getEnabled } from "@/lib/storage";
import { ext } from "@/lib/ext";
import { mountPicker, unmountPicker } from "./mount";

type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

let activeEl: SupportedElement | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let extensionEnabled = true;

// ---------------------------------------------------------------------------
// Focus handlers
// ---------------------------------------------------------------------------

function handleFocusIn(event: FocusEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!isSupportedField(target)) return;
  if (isPasswordField(target)) return;

  // Debounce rapid focus changes (e.g. quick tabbing).
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void openPickerFor(target as SupportedElement);
  }, FOCUS_DEBOUNCE_MS);
}

function handleFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null;

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    // If focus moved to another supported field, let focusin handle it.
    if (next && isSupportedField(next as Element)) return;

    // If focus moved into our shadow host, keep the picker open.
    const host = document.getElementById("clipject-picker-host");
    if (host && next && host.contains(next)) return;

    closePicker();
  }, FOCUS_DEBOUNCE_MS);
}

function handleClickOutside(event: MouseEvent): void {
  const target = event.target as Node;

  // Clicks inside our shadow host are fine.
  const host = document.getElementById("clipject-picker-host");
  if (host?.contains(target)) return;

  // Clicks on the active input are fine.
  if (activeEl && activeEl === target) return;

  closePicker();
}

// ---------------------------------------------------------------------------
// Picker lifecycle
// ---------------------------------------------------------------------------

async function openPickerFor(el: SupportedElement): Promise<void> {
  if (!extensionEnabled) return;

  activeEl = el;

  const { key: pageKey, meta: pageMeta } = computePageKey();
  const inputSignature = computeInputSignature(el);
  const compositeKey = buildCompositeKey(pageKey, inputSignature);
  const inputMeta = buildInputMeta(el);

  mountPicker({
    inputEl: el,
    compositeKey,
    pageMeta,
    inputMeta,
    onClose: closePicker,
  });
}

function closePicker(): void {
  activeEl = null;
  unmountPicker();
}

// ---------------------------------------------------------------------------
// SPA navigation watchers
// ---------------------------------------------------------------------------

function onSpaNavigation(): void {
  // Page context changed — close the picker so stale keys aren't used.
  closePicker();
}

function watchTitleChanges(): MutationObserver {
  const titleEl = document.querySelector("title");
  const observer = new MutationObserver(onSpaNavigation);

  if (titleEl) {
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
  } else {
    // If there's no <title> yet, watch <head> for one to appear.
    const head = document.head;
    if (head) {
      const headObserver = new MutationObserver(() => {
        const title = document.querySelector("title");
        if (title) {
          headObserver.disconnect();
          observer.observe(title, { childList: true, characterData: true, subtree: true });
        }
      });
      headObserver.observe(head, { childList: true });
    }
  }

  return observer;
}

// ---------------------------------------------------------------------------
// Enabled-state listener
// ---------------------------------------------------------------------------

function watchEnabledState(): void {
  ext.storage.onChanged.addListener((changes) => {
    if (STORAGE_KEY_ENABLED in changes) {
      extensionEnabled = (changes[STORAGE_KEY_ENABLED].newValue as boolean) ?? true;
      if (!extensionEnabled) {
        closePicker();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Public init
// ---------------------------------------------------------------------------

export function initObserver(): void {
  // Hydrate the enabled flag.
  void getEnabled().then((v) => {
    extensionEnabled = v;
  });

  // Focus / click events.
  document.addEventListener("focusin", handleFocusIn, { capture: true });
  document.addEventListener("focusout", handleFocusOut, { capture: true });
  document.addEventListener("mousedown", handleClickOutside, { capture: true });

  // SPA navigation.
  window.addEventListener("popstate", onSpaNavigation);
  window.addEventListener("hashchange", onSpaNavigation);
  watchTitleChanges();

  // Enabled state from storage.
  watchEnabledState();
}
