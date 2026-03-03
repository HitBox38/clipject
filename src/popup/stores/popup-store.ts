import { create } from "zustand";
import {
  getEnabled,
  getGlobalSnippets,
  getPerInputDb,
  getTrackedInputs,
  setEnabled,
} from "@/lib/storage";

interface PopupState {
  enabled: boolean;
  globalCount: number;
  inputCount: number;
  trackedCount: number;
  loaded: boolean;

  loadStats: () => Promise<void>;
  toggleEnabled: () => Promise<void>;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  enabled: true,
  globalCount: 0,
  inputCount: 0,
  trackedCount: 0,
  loaded: false,

  async loadStats() {
    const [isEnabled, globals, db, tracked] = await Promise.all([
      getEnabled(),
      getGlobalSnippets(),
      getPerInputDb(),
      getTrackedInputs(),
    ]);
    const totalInputSnippets = Object.values(db).reduce(
      (sum, entry) => sum + entry.snippets.length,
      0,
    );
    set({
      enabled: isEnabled,
      globalCount: globals.length,
      inputCount: totalInputSnippets,
      trackedCount: tracked.length,
      loaded: true,
    });
  },

  async toggleEnabled() {
    const next = !get().enabled;
    set({ enabled: next });
    await setEnabled(next);
  },
}));
