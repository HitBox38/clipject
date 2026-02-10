import { create } from "zustand";
import { ext } from "@/lib/ext";
import { STORAGE_KEY_THEME } from "@/lib/constants";
import type { Theme } from "@/types/storage";
import { PREFERS_DARK_MQ } from "../constants";

// ---------------------------------------------------------------------------
// Pure helpers (no store dependency)
// ---------------------------------------------------------------------------

function getSystemPreference(): "light" | "dark" {
  return window.matchMedia(PREFERS_DARK_MQ).matches ? "dark" : "light";
}

function resolve(theme: Theme, systemPref: "light" | "dark"): "light" | "dark" {
  return theme === "system" ? systemPref : theme;
}

function applyToDOM(resolved: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ThemeState {
  theme: Theme;
  systemPref: "light" | "dark";
  resolved: "light" | "dark";
  loaded: boolean;

  /** Persist and apply a new theme preference. */
  setTheme: (next: Theme) => Promise<void>;

  /**
   * Bootstrap the store: read from storage, attach listeners.
   * Returns a cleanup function that tears down all listeners.
   * Call exactly once per app entry-point (via `useThemeInit`).
   */
  init: () => () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  systemPref: getSystemPreference(),
  resolved: getSystemPreference(),
  loaded: false,

  async setTheme(next: Theme) {
    const { systemPref } = get();
    const resolved = resolve(next, systemPref);
    set({ theme: next, resolved });
    applyToDOM(resolved);
    await ext.storage.local.set({ [STORAGE_KEY_THEME]: next });
  },

  init() {
    // 1. Read persisted value
    ext.storage.local.get(STORAGE_KEY_THEME).then((result) => {
      const stored = (result[STORAGE_KEY_THEME] as Theme) ?? "system";
      const { systemPref } = get();
      const resolved = resolve(stored, systemPref);
      set({ theme: stored, resolved, loaded: true });
      applyToDOM(resolved);
    });

    // 2. Cross-context sync (popup ↔ options)
    const onStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
    ) => {
      const change = changes[STORAGE_KEY_THEME];
      if (!change) return;
      const next = (change.newValue as Theme) ?? "system";
      const { systemPref } = get();
      const resolved = resolve(next, systemPref);
      set({ theme: next, resolved });
      applyToDOM(resolved);
    };
    ext.storage.onChanged.addListener(onStorageChange);

    // 3. OS preference tracking
    const mq = window.matchMedia(PREFERS_DARK_MQ);
    const onSystemChange = (e: MediaQueryListEvent) => {
      const systemPref: "light" | "dark" = e.matches ? "dark" : "light";
      const { theme } = get();
      const resolved = resolve(theme, systemPref);
      set({ systemPref, resolved });
      applyToDOM(resolved);
    };
    mq.addEventListener("change", onSystemChange);

    // 4. Cleanup
    return () => {
      ext.storage.onChanged.removeListener(onStorageChange);
      mq.removeEventListener("change", onSystemChange);
    };
  },
}));
