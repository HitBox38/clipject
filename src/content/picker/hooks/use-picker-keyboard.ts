import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { SnippetItemData } from "../types";

interface UsePickerKeyboardOptions {
  enabled?: boolean;
  pickerRef: RefObject<HTMLDivElement | null>;
  items: SnippetItemData[];
  onSelect: (item: SnippetItemData) => void;
  onClose: () => void;
}

/**
 * Manages keyboard navigation for the picker list.
 *  - ArrowDown / ArrowUp in picker search to move highlight
 *  - Enter in picker search to select
 *  - Escape to close
 *
 * Automatically resets the highlight when the items array changes
 * (e.g. after a search filter).
 */
export function usePickerKeyboard({
  enabled = true,
  pickerRef,
  items,
  onSelect,
  onClose,
}: UsePickerKeyboardOptions) {
  const [requestedIndex, setHighlightedIndex] = useState(0);
  const highlightedIndex = items.length
    ? Math.max(0, Math.min(requestedIndex, items.length - 1))
    : -1;

  // Keep a stable ref of items so the keydown handler always
  // sees the latest list without needing to re-attach the listener.
  const itemsRef = useRef(items);

  const highlightRef = useRef(highlightedIndex);

  const onSelectRef = useRef(onSelect);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    itemsRef.current = items;
    highlightRef.current = highlightedIndex;
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
  }, [items, highlightedIndex, onSelect, onClose]);

  // A stable handler that reads everything from refs.
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
    // Opening the picker does not opt the host field into snippet navigation.
    // Keep its Enter and arrow keys native, including after hovering a snippet.
    // Shadow DOM retargets event.target, so inspect the original event path.
    const path = e.composedPath();
    const target = path[0] as HTMLElement | undefined;
    if (
      e.key !== "Escape" &&
      (!pickerRef.current ||
        !path.includes(pickerRef.current) ||
        target?.closest?.("button, select") ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey)
    ) {
      return;
    }
    const currentItems = itemsRef.current;
    const len = currentItems.length;

    switch (e.key) {
      case "ArrowDown":
        if (!len) return;
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < len - 1 ? prev + 1 : 0));
        break;

      case "ArrowUp":
        if (!len) return;
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : len - 1));
        break;

      case "Enter":
        if (!len || highlightRef.current < 0) return;
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
  }, [pickerRef]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
  }, [enabled, handleKeyDown]);

  return { highlightedIndex, setHighlightedIndex };
}
