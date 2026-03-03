import { create } from "zustand";
import { exportAllData } from "@/lib/storage";
import { useOptionsStore } from "@/options/stores/options-store";
import type { ClipjectExportPayload, ImportResult } from "@/types/storage";

export type ImportStrategy = "merge" | "replace";

interface ImportExportState {
  exporting: boolean;
  strategy: ImportStrategy;
  pendingPayload: ClipjectExportPayload | null;
  importError: string | null;
  importResult: ImportResult | null;
  confirmOpen: boolean;

  setStrategy: (value: ImportStrategy) => void;
  setExporting: (value: boolean) => void;
  fileValid: (payload: ClipjectExportPayload) => void;
  fileError: (message: string) => void;
  clearImportMessage: () => void;
  cancelImport: () => void;
  importDone: (result: ImportResult) => void;
  importFailed: (message: string) => void;

  runExport: () => Promise<void>;
  confirmImport: () => Promise<void>;
}

export const useImportExportStore = create<ImportExportState>((set, get) => ({
  exporting: false,
  strategy: "merge",
  pendingPayload: null,
  importError: null,
  importResult: null,
  confirmOpen: false,

  setStrategy(value) {
    set({ strategy: value });
  },

  setExporting(value) {
    set({ exporting: value });
  },

  fileValid(payload) {
    set({
      pendingPayload: payload,
      importError: null,
      importResult: null,
      confirmOpen: true,
    });
  },

  fileError(message) {
    set({ importError: message, importResult: null });
  },

  clearImportMessage() {
    set({ importError: null, importResult: null });
  },

  cancelImport() {
    set({ pendingPayload: null, confirmOpen: false });
  },

  importDone(result) {
    set({
      importResult: result,
      pendingPayload: null,
      confirmOpen: false,
    });
  },

  importFailed(message) {
    set({ importError: message, confirmOpen: false });
  },

  async runExport() {
    set({ exporting: true });
    try {
      const payload = await exportAllData();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clipject-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      set({ exporting: false });
    }
  },

  async confirmImport() {
    const { pendingPayload, strategy } = get();
    if (!pendingPayload) return;
    const importData = useOptionsStore.getState().importData;
    try {
      const result = await importData(pendingPayload, strategy);
      get().importDone(result);
    } catch (err) {
      get().importFailed(
        err instanceof Error ? err.message : "Import failed unexpectedly.",
      );
    }
  },
}));
