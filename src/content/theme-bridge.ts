/**
 * Lightweight theme bridge for the content script's Shadow DOM.
 *
 * This deliberately avoids the Zustand theme store because:
 *  - The store's `applyToDOM` targets `document.documentElement`,
 *    which we must NOT touch from a content script.
 *  - We only need to toggle a `.dark` class on the shadow container.
 *
 * Reads the persisted theme from chrome.storage.local, resolves
 * "system" using matchMedia, and keeps the container in sync.
 */

import { ext } from "@/lib/ext";
import { STORAGE_KEY_THEME } from "@/lib/constants";
import type { Theme } from "@/types/storage";

const PREFERS_DARK_MQ = "(prefers-color-scheme: dark)";

const getSystemPreference = (): boolean => {
  return window.matchMedia(PREFERS_DARK_MQ).matches;
}

const resolve = (theme: Theme): boolean => {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return getSystemPreference();
}

const apply = (container: HTMLElement, isDark: boolean): void => {
  container.classList.toggle("dark", isDark);
}

/**
 * Attaches theme tracking to a shadow DOM container element.
 * Returns a cleanup function that removes all listeners.
 */
export const initPickerTheme = (container: HTMLElement): () => void => {
  let currentTheme: Theme = "system";

  // 1. Read persisted value
  ext.storage.local.get(STORAGE_KEY_THEME).then((result) => {
    currentTheme = (result[STORAGE_KEY_THEME] as Theme) ?? "system";
    apply(container, resolve(currentTheme));
  });

  // 2. Cross-context storage sync
  const onStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
  ) => {
    const change = changes[STORAGE_KEY_THEME];
    if (!change) return;
    currentTheme = (change.newValue as Theme) ?? "system";
    apply(container, resolve(currentTheme));
  };
  ext.storage.onChanged.addListener(onStorageChange);

  // 3. OS preference tracking (matters when theme === "system")
  const mq = window.matchMedia(PREFERS_DARK_MQ);
  const onSystemChange = () => {
    if (currentTheme === "system") {
      apply(container, getSystemPreference());
    }
  };
  mq.addEventListener("change", onSystemChange);

  // 4. Cleanup
  return () => {
    ext.storage.onChanged.removeListener(onStorageChange);
    mq.removeEventListener("change", onSystemChange);
  };
}
