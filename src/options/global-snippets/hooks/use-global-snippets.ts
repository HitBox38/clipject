import { useOptionsStore } from "@/options/stores/options-store";

/**
 * Thin wrapper that selects global-snippet state from the options store.
 */
export function useGlobalSnippets() {
  const globalSnippets = useOptionsStore((s) => s.globalSnippets);
  const addGlobalSnippet = useOptionsStore((s) => s.addGlobalSnippet);
  const removeGlobalSnippet = useOptionsStore((s) => s.removeGlobalSnippet);
  const editGlobalSnippet = useOptionsStore((s) => s.editGlobalSnippet);

  return {
    globalSnippets,
    addGlobalSnippet,
    removeGlobalSnippet,
    editGlobalSnippet,
  };
}
