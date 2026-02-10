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
}

/**
 * Loads the per-input and global snippets for a given composite key.
 * Automatically refreshes when chrome.storage changes.
 */
export function useSnippets(compositeKey: string): UseSnippetsResult {
  const [perInputSnippets, setPerInputSnippets] = useState<Snippet[]>([]);
  const [globalSnippets, setGlobalSnippets] = useState<GlobalSnippet[]>([]);

  const load = useCallback(async () => {
    const [entry, globals] = await Promise.all([
      getInputEntry(compositeKey),
      getGlobalSnippets(),
    ]);

    setPerInputSnippets(entry?.snippets ?? []);
    setGlobalSnippets(globals);
  }, [compositeKey]);

  // Initial load.
  useEffect(() => {
    void load();
  }, [load]);

  // React to storage changes from other contexts (options page, other tabs).
  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
    ) => {
      if (
        STORAGE_KEY_PER_INPUT_DB in changes ||
        STORAGE_KEY_GLOBAL_SNIPPETS in changes
      ) {
        void load();
      }
    };

    ext.storage.onChanged.addListener(listener);
    return () => ext.storage.onChanged.removeListener(listener);
  }, [load]);

  return { perInputSnippets, globalSnippets, reload: load };
}
