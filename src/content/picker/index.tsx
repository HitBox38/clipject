import { useCallback, useMemo, useRef, useState } from "react";
import type { PickerProps, SnippetItemData } from "./types";
import { usePickerPosition } from "./hooks/use-picker-position";
import { useSnippets } from "./hooks/use-snippets";
import { usePickerKeyboard } from "./hooks/use-picker-keyboard";
import { SnippetList } from "./components/snippet-list";
import { PickerFooter } from "./components/picker-footer";
import { AddSnippetForm } from "./components/add-snippet-form";
import { setNativeValue } from "@/lib/paste";
import {
  createSnippet,
  saveGlobalSnippet,
  saveInputSnippet,
} from "@/lib/storage";

export function Picker({
  inputEl,
  compositeKey,
  pageMeta,
  inputMeta,
  onClose,
}: PickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Load snippets and keep them in sync.
  const { perInputSnippets, globalSnippets, reload } =
    useSnippets(compositeKey);

  // Combine into a flat list for keyboard navigation.
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

  const allItems = useMemo(
    () => [...perInputItems, ...globalItems],
    [perInputItems, globalItems],
  );

  // Position the picker near the focused input.
  const position = usePickerPosition(inputEl, onClose);

  // Select a snippet: paste its value and close.
  const handleSelect = useCallback(
    (item: SnippetItemData) => {
      setNativeValue(inputEl, item.snippet.value);
      onClose();
      inputEl.focus();
    },
    [inputEl, onClose],
  );

  // Keyboard navigation.
  const { highlightedIndex, setHighlightedIndex } = usePickerKeyboard({
    items: allItems,
    onSelect: handleSelect,
    onClose,
  });

  // "Save current value" — grabs whatever is currently in the input.
  const handleSaveCurrentValue = useCallback(async () => {
    const currentValue = inputEl.value.trim();
    if (!currentValue) return;

    const snippet = createSnippet(currentValue);
    await saveInputSnippet(compositeKey, pageMeta, inputMeta, snippet);
    await reload();
  }, [inputEl, compositeKey, pageMeta, inputMeta, reload]);

  // "Add new" form submission.
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
      className="clipject-picker"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => {
        // Prevent the picker from stealing focus from the input.
        e.preventDefault();
      }}
    >
      <div className="clipject-picker-header">
        <span>ClipJect</span>
        <button
          type="button"
          className="clipject-close-btn"
          onClick={onClose}
        >
          &times;
        </button>
      </div>

      {!isAdding && (
        <>
          <SnippetList
            perInputItems={perInputItems}
            globalItems={globalItems}
            highlightedIndex={highlightedIndex}
            onSelect={handleSelect}
            onHighlight={setHighlightedIndex}
          />

          <PickerFooter
            onSaveCurrentValue={handleSaveCurrentValue}
            onAddNew={() => setIsAdding(true)}
            hasCurrentValue={inputEl.value.trim().length > 0}
          />
        </>
      )}

      {isAdding && (
        <AddSnippetForm
          onSave={handleAddNew}
          onCancel={() => setIsAdding(false)}
        />
      )}
    </div>
  );
}
