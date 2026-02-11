import { useMemo, useState } from "react";
import type { SnippetItemData } from "../types";

interface UsePickerSearchResult {
  query: string;
  setQuery: (q: string) => void;
  filteredPerInput: SnippetItemData[];
  filteredGlobal: SnippetItemData[];
}

function matchesQuery(item: SnippetItemData, lowerQuery: string): boolean {
  const { snippet } = item;
  return (
    snippet.value.toLowerCase().includes(lowerQuery) ||
    (snippet.label?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

/**
 * Filters per-input and global snippet items by a search query.
 * Matches against both `snippet.label` and `snippet.value`.
 */
export function usePickerSearch(
  perInputItems: SnippetItemData[],
  globalItems: SnippetItemData[],
): UsePickerSearchResult {
  const [query, setQuery] = useState("");

  const lowerQuery = query.toLowerCase().trim();

  const filteredPerInput = useMemo(
    () =>
      lowerQuery
        ? perInputItems.filter((i) => matchesQuery(i, lowerQuery))
        : perInputItems,
    [perInputItems, lowerQuery],
  );

  const filteredGlobal = useMemo(
    () =>
      lowerQuery
        ? globalItems.filter((i) => matchesQuery(i, lowerQuery))
        : globalItems,
    [globalItems, lowerQuery],
  );

  return { query, setQuery, filteredPerInput, filteredGlobal };
}
