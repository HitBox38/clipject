import type { SnippetItemData } from "../types";
import { SnippetItem } from "./snippet-item";

interface Props {
  perInputItems: SnippetItemData[];
  globalItems: SnippetItemData[];
  highlightedIndex: number;
  onSelect: (item: SnippetItemData) => void;
  onHighlight: (index: number) => void;
  emptyText: string;
}

/**
 * Renders the combined list: per-input snippets first, then globals.
 * Scope labels remain visible even when only one category has items.
 */
export const SnippetList = ({
  perInputItems,
  globalItems,
  highlightedIndex,
  onSelect,
  onHighlight,
  emptyText,
}: Props) => {
  const allItems = [...perInputItems, ...globalItems];

  if (allItems.length === 0) {
    return <div className="clipject-empty">{emptyText}</div>;
  }

  let runningIndex = 0;

  return (
    <div className="clipject-list">
      {perInputItems.length > 0 && (
        <>
          <div className="clipject-section-label">For this field</div>
          {perInputItems.map((item) => {
            const idx = runningIndex++;
            return (
              <SnippetItem
                key={item.snippet.id}
                item={item}
                highlighted={idx === highlightedIndex}
                onClick={() => onSelect(item)}
                onMouseEnter={() => onHighlight(idx)}
              />
            );
          })}
        </>
      )}

      {globalItems.length > 0 && (
        <>
          <div className="clipject-section-label">
            Global · any selected field
          </div>
          {globalItems.map((item) => {
            const idx = runningIndex++;
            return (
              <SnippetItem
                key={item.snippet.id}
                item={item}
                highlighted={idx === highlightedIndex}
                onClick={() => onSelect(item)}
                onMouseEnter={() => onHighlight(idx)}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
