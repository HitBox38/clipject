/**
 * Observes focus events on input/textarea elements across the page.
 *
 * The picker only opens for inputs that have been explicitly tracked
 * (via the popup's "Select Element" flow) or that already have saved
 * snippets in the per-input database.
 *
 * When focus leaves all tracked elements, unmount the picker.
 *
 * Also watches for SPA navigation (popstate, hashchange, title changes)
 * and re-computes keys / closes the picker when the page context changes.
 */

import {
  buildCompositeKey,
  buildInputMeta,
  buildTrackingFingerprint,
  computeInputSignature,
  computePageKey,
  isPasswordField,
  isSupportedField,
} from "@/lib/keys";
import {
  FOCUS_DEBOUNCE_MS,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_PER_INPUT_DB,
  STORAGE_KEY_TRACKED_INPUTS,
} from "@/lib/constants";
import { buildTrackedFingerprintSet, getEnabled } from "@/lib/storage";
import { ext } from "@/lib/ext";
import { mountPicker, unmountPicker } from "./mount";
import { startElementSelector, isElementSelectorActive } from "./element-selector";
import type { ClipjectMessage } from "@/types/messages";

type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

let activeEl: SupportedElement | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let extensionEnabled = true;

/**
 * In-memory cache of tracking fingerprints.
 * Rebuilt from storage on init and whenever tracked inputs or
 * per-input DB changes.
 */
let trackedFingerprints = new Set<string>();

// ---------------------------------------------------------------------------
// Tracked fingerprints cache
// ---------------------------------------------------------------------------

async function refreshTrackedFingerprints(): Promise<void> {
  trackedFingerprints = await buildTrackedFingerprintSet();
}

function isInputTracked(el: SupportedElement): boolean {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const signature = computeInputSignature(el);
  const fingerprint = buildTrackingFingerprint(origin, pathname, signature);
  return trackedFingerprints.has(fingerprint);
}

// ---------------------------------------------------------------------------
// Focus handlers
// ---------------------------------------------------------------------------

function handleFocusIn(event: FocusEvent): void {
  // Don't open picker while the element-selection overlay is active.
  if (isElementSelectorActive()) return;

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

  // Only open the picker for inputs that are tracked.
  if (!isInputTracked(el)) return;

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
// Storage-change listeners
// ---------------------------------------------------------------------------

function watchStorageChanges(): void {
  ext.storage.onChanged.addListener((changes) => {
    // Enabled flag.
    if (STORAGE_KEY_ENABLED in changes) {
      extensionEnabled =
        (changes[STORAGE_KEY_ENABLED].newValue as boolean) ?? true;
      if (!extensionEnabled) {
        closePicker();
      }
    }

    // Tracked inputs or per-input DB changed — rebuild the fingerprint cache.
    if (
      STORAGE_KEY_TRACKED_INPUTS in changes ||
      STORAGE_KEY_PER_INPUT_DB in changes
    ) {
      void refreshTrackedFingerprints();
    }
  });
}

// ---------------------------------------------------------------------------
// Message listener (popup -> content)
// ---------------------------------------------------------------------------

function watchMessages(): void {
  ext.runtime.onMessage.addListener(
    (message: ClipjectMessage, _sender, sendResponse) => {
      if (message.type === "CLIPJECT_START_ELEMENT_SELECTION") {
        startElementSelector();
        sendResponse({ ok: true });
      }
      // Return false (synchronous) — no async response needed.
      return false;
    },
  );
}

// ---------------------------------------------------------------------------
// Public init
// ---------------------------------------------------------------------------

export function initObserver(): void {
  // Hydrate the enabled flag and tracked-fingerprint cache.
  void getEnabled().then((v) => {
    extensionEnabled = v;
  });
  void refreshTrackedFingerprints();

  // Focus / click events.
  document.addEventListener("focusin", handleFocusIn, { capture: true });
  document.addEventListener("focusout", handleFocusOut, { capture: true });
  document.addEventListener("mousedown", handleClickOutside, { capture: true });

  // SPA navigation.
  window.addEventListener("popstate", onSpaNavigation);
  window.addEventListener("hashchange", onSpaNavigation);
  watchTitleChanges();

  // Storage change watchers (enabled state + tracked inputs).
  watchStorageChanges();

  // Listen for messages from popup / background.
  watchMessages();
}
