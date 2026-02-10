import { useCallback, useEffect, useState } from "react";
import type { SnippetItemData } from "../types";

interface UsePickerKeyboardOptions {
  items: SnippetItemData[];
  onSelect: (item: SnippetItemData) => void;
  onClose: () => void;
}

/**
 * Manages keyboard navigation for the picker list.
 *  - ArrowDown / ArrowUp to move highlight
 *  - Enter to select
 *  - Escape to close
 */
export function usePickerKeyboard({
  items,
  onSelect,
  onClose,
}: UsePickerKeyboardOptions) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : 0,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : items.length - 1,
          );
          break;

        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect(items[highlightedIndex]);
          }
          break;

        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [items, highlightedIndex, onSelect, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  return { highlightedIndex, setHighlightedIndex };
}
