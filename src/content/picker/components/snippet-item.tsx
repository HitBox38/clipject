import type { SnippetItemData } from "../types";

interface Props {
  item: SnippetItemData;
  highlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function SnippetItem({
  item,
  highlighted,
  onClick,
  onMouseEnter,
}: Props) {
  const { snippet } = item;
  const displayLabel = snippet.label || undefined;
  const displayValue =
    snippet.value.length > 60
      ? `${snippet.value.slice(0, 60)}...`
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
