import { useCallback, useEffect, useRef, useState } from "react";
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
 *
 * Automatically resets the highlight when the items array changes
 * (e.g. after a search filter).
 */
export function usePickerKeyboard({
  items,
  onSelect,
  onClose,
}: UsePickerKeyboardOptions) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Keep a stable ref of items so the keydown handler always
  // sees the latest list without needing to re-attach the listener.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const highlightRef = useRef(highlightedIndex);
  highlightRef.current = highlightedIndex;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset highlight when items change (search filter, data reload, etc.)
  const prevLenRef = useRef(items.length);
  useEffect(() => {
    if (items.length !== prevLenRef.current) {
      setHighlightedIndex(items.length > 0 ? 0 : -1);
      prevLenRef.current = items.length;
    }
  }, [items.length]);

  // A stable handler that reads everything from refs.
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const currentItems = itemsRef.current;
    const len = currentItems.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < len - 1 ? prev + 1 : 0));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : len - 1));
        break;

      case "Enter":
        e.preventDefault();
        {
          const idx = highlightRef.current;
          if (idx >= 0 && idx < len) {
            onSelectRef.current(currentItems[idx]);
          }
        }
        break;

      case "Escape":
        e.preventDefault();
        onCloseRef.current();
        break;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
  }, [handleKeyDown]);

  return { highlightedIndex, setHighlightedIndex };
}
