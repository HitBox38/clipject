import type { SnippetItemData } from "../types";

interface Props {
  item: SnippetItemData;
  highlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

/**
 * A single snippet entry in the picker list.
 *
 * Uses a stacked layout matching the options page snippet rows:
 *   • Label (font-medium)  — only shown when a label exists
 *   • Value (muted)        — always shown, truncated
 */
export const SnippetItem = ({
  item,
  highlighted,
  onClick,
  onMouseEnter,
}: Props) => {
  const { snippet } = item;
  const displayLabel = snippet.label || undefined;
  const displayValue =
    snippet.value.length > 80
      ? `${snippet.value.slice(0, 80)}…`
      : snippet.value;

  return (
    <button
      className={`clipject-item${highlighted ? " highlighted" : ""}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      type="button"
    >
      {displayLabel && (
        <span className="clipject-item-label">{displayLabel}</span>
      )}
      <span className="clipject-item-value">{displayValue}</span>
    </button>
  );
}
