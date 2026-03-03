import { create } from "zustand";
import { useOptionsStore } from "@/options/stores/options-store";

interface CloneEntryState {
  sourceKey: string;
  targetOrigin: string;
  targetPathname: string;
  targetInputSig: string;
  error: string | null;
  success: string | null;
  cloning: boolean;

  setSource: (key: string, pathname?: string, inputSig?: string) => void;
  setTargetOrigin: (value: string) => void;
  setTargetPathname: (value: string) => void;
  setTargetInputSig: (value: string) => void;
  clearMessage: () => void;
  cloneSuccess: (message: string) => void;
  cloneError: (message: string) => void;

  runClone: () => Promise<void>;
}

export const useCloneEntryStore = create<CloneEntryState>((set, get) => ({
  sourceKey: "",
  targetOrigin: "",
  targetPathname: "",
  targetInputSig: "",
  error: null,
  success: null,
  cloning: false,

  setSource(key, pathname, inputSig) {
    set({
      sourceKey: key,
      error: null,
      success: null,
      ...(pathname !== undefined && { targetPathname: pathname }),
      ...(inputSig !== undefined && { targetInputSig: inputSig }),
    });
  },

  setTargetOrigin(value) {
    set({ targetOrigin: value, error: null, success: null });
  },

  setTargetPathname(value) {
    set({ targetPathname: value, error: null, success: null });
  },

  setTargetInputSig(value) {
    set({ targetInputSig: value, error: null, success: null });
  },

  clearMessage() {
    set({ error: null, success: null });
  },

  cloneSuccess(message) {
    set({
      cloning: false,
      success: message,
      error: null,
      sourceKey: "",
      targetOrigin: "",
      targetPathname: "",
      targetInputSig: "",
    });
  },

  cloneError(message) {
    set({ cloning: false, error: message });
  },

  async runClone() {
    const { sourceKey, targetOrigin, targetPathname, targetInputSig } = get();
    get().clearMessage();

    if (!sourceKey) {
      get().cloneError("Select a source entry first.");
      return;
    }

    const trimmedOrigin = targetOrigin.trim();
    if (!trimmedOrigin) {
      get().cloneError("Target origin is required.");
      return;
    }

    try {
      const url = new URL(trimmedOrigin);
      if (url.origin !== trimmedOrigin) {
        get().cloneError(
          `Origin should not have a trailing path. Did you mean "${url.origin}"?`,
        );
        return;
      }
    } catch {
      get().cloneError(
        'Target origin must be a valid URL origin (e.g. "https://example.com").',
      );
      return;
    }

    const trimmedPathname = targetPathname.trim() || "/";
    const trimmedSig = targetInputSig.trim() || undefined;

    set({ cloning: true });
    const cloneEntry = useOptionsStore.getState().cloneEntry;
    try {
      const count = await cloneEntry(
        sourceKey,
        trimmedOrigin,
        trimmedPathname,
        trimmedSig,
      );
      get().cloneSuccess(
        `Cloned ${count} snippet(s) to ${trimmedOrigin}${trimmedPathname}.`,
      );
    } catch (err) {
      get().cloneError(
        err instanceof Error ? err.message : "Clone failed unexpectedly.",
      );
    }
  },
}));
