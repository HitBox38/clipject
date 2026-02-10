import { useCallback, useState } from "react";

interface Props {
  onSave: (value: string, label: string, scope: "input" | "global") => void;
  onCancel: () => void;
}

/**
 * Inline form for creating a new snippet.
 * The user can type text, add an optional label, and choose scope.
 */
export function AddSnippetForm({ onSave, onCancel }: Props) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"input" | "global">("input");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed, label.trim(), scope);
  }, [value, label, scope, onSave]);

  return (
    <div
      className="clipject-add-form"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSubmit();
        }
        // Stop Escape from bubbling to the picker-level handler
        // while the form is focused.
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <textarea
        placeholder="Snippet text..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />

      <input
        type="text"
        placeholder="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <div className="clipject-add-row">
        <div className="clipject-scope-toggle">
          <button
            type="button"
            className={`clipject-scope-btn${scope === "input" ? " active" : ""}`}
            onClick={() => setScope("input")}
          >
            This field
          </button>
          <button
            type="button"
            className={`clipject-scope-btn${scope === "global" ? " active" : ""}`}
            onClick={() => setScope("global")}
          >
            Global
          </button>
        </div>

        <button
          type="button"
          className="clipject-footer-btn primary"
          onClick={handleSubmit}
          disabled={!value.trim()}
        >
          Save
        </button>
        <button
          type="button"
          className="clipject-footer-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
