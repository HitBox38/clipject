interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search input with magnifying-glass icon.
 * Uses the .cj-input class for shadcn-matched styling.
 *
 * `onMouseDown` propagation is stopped so clicking the input
 * receives focus without triggering the picker's blanket
 * `preventDefault()` handler.
 */
export function SearchInput({ value, onChange }: Props) {
  return (
    <div
      className="clipject-search"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="clipject-search-wrap">
        <svg
          className="clipject-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          className="cj-input"
          placeholder="Search snippets…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
