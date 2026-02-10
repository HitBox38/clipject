import { create } from "zustand";
import type {
  GlobalSnippet,
  InputEntry,
  PerInputDb,
  Snippet,
} from "@/types/storage";
import {
  clearAllData,
  createSnippet,
  deleteGlobalSnippet,
  deleteInputEntry,
  deleteInputSnippet,
  getGlobalSnippets,
  getPerInputDb,
  saveGlobalSnippet,
  updateGlobalSnippet,
  updateInputSnippet,
} from "@/lib/storage";

interface OptionsState {
  /** All global snippets. */
  globalSnippets: GlobalSnippet[];
  /** Full per-input database keyed by composite key. */
  perInputDb: PerInputDb;
  /** Currently selected per-input composite key (for detail view). */
  selectedEntryKey: string | null;
  /** Whether initial data has loaded. */
  loaded: boolean;

  // --- Actions ---
  loadAll: () => Promise<void>;

  // Global snippets
  addGlobalSnippet: (value: string, label?: string) => Promise<void>;
  removeGlobalSnippet: (id: string) => Promise<void>;
  editGlobalSnippet: (
    id: string,
    patch: Partial<Pick<Snippet, "value" | "label">>,
  ) => Promise<void>;

  // Per-input snippets
  removeInputSnippet: (
    compositeKey: string,
    snippetId: string,
  ) => Promise<void>;
  editInputSnippet: (
    compositeKey: string,
    snippetId: string,
    patch: Partial<Pick<Snippet, "value" | "label">>,
  ) => Promise<void>;
  removeInputEntry: (compositeKey: string) => Promise<void>;

  // Selection
  selectEntry: (key: string | null) => void;

  // Bulk
  clearAll: () => Promise<void>;
}

export const useOptionsStore = create<OptionsState>((set, get) => ({
  globalSnippets: [],
  perInputDb: {},
  selectedEntryKey: null,
  loaded: false,

  async loadAll() {
    const [globalSnippets, perInputDb] = await Promise.all([
      getGlobalSnippets(),
      getPerInputDb(),
    ]);
    set({ globalSnippets, perInputDb, loaded: true });
  },

  // ---- Global snippets ----

  async addGlobalSnippet(value, label) {
    const snippet = createSnippet(value, label);
    await saveGlobalSnippet(snippet);
    await get().loadAll();
  },

  async removeGlobalSnippet(id) {
    await deleteGlobalSnippet(id);
    await get().loadAll();
  },

  async editGlobalSnippet(id, patch) {
    await updateGlobalSnippet(id, patch);
    await get().loadAll();
  },

  // ---- Per-input snippets ----

  async removeInputSnippet(compositeKey, snippetId) {
    await deleteInputSnippet(compositeKey, snippetId);
    await get().loadAll();
  },

  async editInputSnippet(compositeKey, snippetId, patch) {
    await updateInputSnippet(compositeKey, snippetId, patch);
    await get().loadAll();
  },

  async removeInputEntry(compositeKey) {
    await deleteInputEntry(compositeKey);
    const current = get().selectedEntryKey;
    set({ selectedEntryKey: current === compositeKey ? null : current });
    await get().loadAll();
  },

  // ---- Selection ----

  selectEntry(key) {
    set({ selectedEntryKey: key });
  },

  // ---- Bulk ----

  async clearAll() {
    await clearAllData();
    set({
      globalSnippets: [],
      perInputDb: {},
      selectedEntryKey: null,
    });
  },
}));

/**
 * Derive a grouped list of per-input entries by page (origin + pathname).
 */
export function groupEntriesByPage(
  db: PerInputDb,
): Map<string, { pageLabel: string; entries: [string, InputEntry][] }> {
  const map = new Map<
    string,
    { pageLabel: string; entries: [string, InputEntry][] }
  >();

  for (const [compositeKey, entry] of Object.entries(db)) {
    const pageKey = `${entry.page.origin}${entry.page.pathname}`;
    const existing = map.get(pageKey);
    if (existing) {
      existing.entries.push([compositeKey, entry]);
    } else {
      map.set(pageKey, {
        pageLabel: `${entry.page.origin}${entry.page.pathname} — ${entry.page.titleLastSeen}`,
        entries: [[compositeKey, entry]],
      });
    }
  }

  return map;
}
