import { useMemo } from "react";
import {
  groupEntriesByPage,
  useOptionsStore,
} from "@/options/stores/options-store";
import type { PageGroup } from "../types";

export function usePerInputSnippets() {
  const perInputDb = useOptionsStore((s) => s.perInputDb);
  const selectedEntryKey = useOptionsStore((s) => s.selectedEntryKey);
  const selectEntry = useOptionsStore((s) => s.selectEntry);
  const removeInputSnippet = useOptionsStore((s) => s.removeInputSnippet);
  const editInputSnippet = useOptionsStore((s) => s.editInputSnippet);
  const removeInputEntry = useOptionsStore((s) => s.removeInputEntry);

  const pageGroups: PageGroup[] = useMemo(() => {
    const grouped = groupEntriesByPage(perInputDb);
    return Array.from(grouped.entries()).map(
      ([pageKey, { pageLabel, entries }]) => ({
        pageKey,
        pageLabel,
        entries,
      }),
    );
  }, [perInputDb]);

  const selectedEntry = selectedEntryKey
    ? perInputDb[selectedEntryKey] ?? null
    : null;

  return {
    pageGroups,
    selectedEntryKey,
    selectedEntry,
    selectEntry,
    removeInputSnippet,
    editInputSnippet,
    removeInputEntry,
  };
}
