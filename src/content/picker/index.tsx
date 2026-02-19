import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PickerProps, SnippetItemData } from "./types";
import { usePickerPosition } from "./hooks/use-picker-position";
import { useSnippets } from "./hooks/use-snippets";
import { usePickerKeyboard } from "./hooks/use-picker-keyboard";
import { usePickerSearch } from "./hooks/use-picker-search";
import { usePickerResize } from "./hooks/use-picker-resize";
import { SnippetList } from "./components/snippet-list";
import { PickerFooter } from "./components/picker-footer";
import { AddSnippetForm } from "./components/add-snippet-form";
import { SearchInput } from "./components/search-input";
import { ResizeHandle } from "./components/resize-handle";
import { setNativeValue } from "@/lib/paste";
import {
  createSnippet,
  saveGlobalSnippet,
  saveInputSnippet,
} from "@/lib/storage";

export const Picker = ({
  inputEl,
  compositeKey,
  pageMeta,
  inputMeta,
  onClose,
}: PickerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { perInputSnippets, globalSnippets, reload } =
    useSnippets(compositeKey);

  const perInputItems: SnippetItemData[] = useMemo(
    () =>
      perInputSnippets.map((s) => ({ snippet: s, scope: "input" as const })),
    [perInputSnippets],
  );

  const globalItems: SnippetItemData[] = useMemo(
    () =>
      globalSnippets.map((s) => ({ snippet: s, scope: "global" as const })),
    [globalSnippets],
  );

  const { query, setQuery, filteredPerInput, filteredGlobal } =
    usePickerSearch(perInputItems, globalItems);

  const filteredAll = useMemo(
    () => [...filteredPerInput, ...filteredGlobal],
    [filteredPerInput, filteredGlobal],
  );

  const position = usePickerPosition(inputEl, onClose);
  const { maxHeight, onResizeStart } = usePickerResize();

  const handleSelect = useCallback(
    (item: SnippetItemData) => {
      setNativeValue(inputEl, item.snippet.value);
      onClose();
      inputEl.focus();
    },
    [inputEl, onClose],
  );

  const { highlightedIndex, setHighlightedIndex } = usePickerKeyboard({
    items: filteredAll,
    onSelect: handleSelect,
    onClose,
  });

  useEffect(() => {
    setHighlightedIndex(filteredAll.length > 0 ? 0 : -1);
  }, [filteredAll.length, setHighlightedIndex]);

  const handleSaveCurrentValue = useCallback(async () => {
    const currentValue = inputEl.value.trim();
    if (!currentValue) return;
    const snippet = createSnippet(currentValue);
    await saveInputSnippet(compositeKey, pageMeta, inputMeta, snippet);
    await reload();
  }, [inputEl, compositeKey, pageMeta, inputMeta, reload]);

  const handleAddNew = useCallback(
    async (value: string, label: string, scope: "input" | "global") => {
      const snippet = createSnippet(value, label || undefined);
      if (scope === "global") {
        await saveGlobalSnippet(snippet);
      } else {
        await saveInputSnippet(compositeKey, pageMeta, inputMeta, snippet);
      }
      setIsAdding(false);
      await reload();
    },
    [compositeKey, pageMeta, inputMeta, reload],
  );

  if (!position) return null;

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-modal="true"
      aria-label="ClipJect snippet picker"
      className="clipject-picker"
      style={{ top: position.top, left: position.left, maxHeight }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* ---- Header ---- */}
      <div className="clipject-header">
        <span className="clipject-title">ClipJect</span>
        <button
          type="button"
          className="cj-btn cj-btn--ghost cj-btn--icon-xs"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="cj-separator" />

      {/* ---- Browse mode ---- */}
      {!isAdding && (
        <>
          <SearchInput value={query} onChange={setQuery} />

          <SnippetList
            perInputItems={filteredPerInput}
            globalItems={filteredGlobal}
            highlightedIndex={highlightedIndex}
            onSelect={handleSelect}
            onHighlight={setHighlightedIndex}
            emptyText={
              query
                ? "No matching snippets"
                : "No snippets yet. Add one below."
            }
          />

          <div className="cj-separator" />

          <PickerFooter
            onSaveCurrentValue={handleSaveCurrentValue}
            onAddNew={() => setIsAdding(true)}
            hasCurrentValue={inputEl.value.trim().length > 0}
          />
        </>
      )}

      {/* ---- Add mode ---- */}
      {isAdding && (
        <AddSnippetForm
          onSave={handleAddNew}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <ResizeHandle onMouseDown={onResizeStart} />
    </div>
  );
}

const CloseIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
