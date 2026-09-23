import { useCallback, useEffect, useState } from "react";
import type { GlobalSnippet, Snippet } from "@/types/storage";
import { getGlobalSnippets, getInputEntry } from "@/lib/storage";
import { ext } from "@/lib/ext";
import {
  STORAGE_KEY_GLOBAL_SNIPPETS,
  STORAGE_KEY_PER_INPUT_DB,
} from "@/lib/constants";

interface UseSnippetsResult {
  perInputSnippets: Snippet[];
  globalSnippets: GlobalSnippet[];
  reload: () => Promise<void>;
  loaded: boolean;
  error: string;
}

/**
 * Loads the per-input and global snippets for a given composite key.
 * Automatically refreshes when chrome.storage changes.
 */
export function useSnippets(compositeKey: string): UseSnippetsResult {
  const [perInputSnippets, setPerInputSnippets] = useState<Snippet[]>([]);
  const [globalSnippets, setGlobalSnippets] = useState<GlobalSnippet[]>([]);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [entry, globals] = await Promise.all([
      getInputEntry(compositeKey),
      getGlobalSnippets(),
    ]);

    setPerInputSnippets(entry?.snippets ?? []);
    setGlobalSnippets(globals);
    setLoaded(true);
    setError("");
  }, [compositeKey]);

  // Ignore an initial response after the target field has been unmounted.
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const [entry, globals] = await Promise.all([
          getInputEntry(compositeKey),
          getGlobalSnippets(),
        ]);
        if (cancelled) return;
        setPerInputSnippets(entry?.snippets ?? []);
        setGlobalSnippets(globals);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setError(
            "Couldn’t load snippets. Close and reopen the picker to retry.",
          );
          setLoaded(true);
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [compositeKey]);

  // React to storage changes from other contexts (options page, other tabs).
  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
    ) => {
      if (
        STORAGE_KEY_PER_INPUT_DB in changes ||
        STORAGE_KEY_GLOBAL_SNIPPETS in changes
      ) {
        void load().catch(() =>
          setError(
            "Couldn’t refresh snippets. Close and reopen the picker to retry.",
          ),
        );
      }
    };

    ext.storage.onChanged.addListener(listener);
    return () => ext.storage.onChanged.removeListener(listener);
  }, [load]);

  return { perInputSnippets, globalSnippets, reload: load, loaded, error };
}
