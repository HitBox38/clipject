import { useCallback, useState } from "react";

interface Props {
  onSave: (value: string, label: string, scope: "input" | "global") => void;
  onCancel: () => void;
}

export const AddSnippetForm = ({ onSave, onCancel }: Props) => {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"input" | "global">("input");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed, label.trim(), scope);
  }, [value, label, scope, onSave]);

  return (
    <form
      className="clipject-form"
      onMouseDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSubmit();
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div className="cj-field">
        <label htmlFor="clipject-snippet-text" className="cj-label">
          Snippet text
        </label>
        <textarea
          id="clipject-snippet-text"
          className="cj-textarea"
          placeholder="Type or paste text…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <div className="cj-field">
        <label htmlFor="clipject-snippet-label" className="cj-label">
          Label (optional)
        </label>
        <input
          id="clipject-snippet-label"
          type="text"
          className="cj-input"
          placeholder="e.g. greeting, disclaimer…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <div className="clipject-form-row">
        <div className="clipject-scope">
          <button
            type="button"
            className={`cj-btn cj-btn--xs ${scope === "input" ? "cj-btn--default" : "cj-btn--outline"}`}
            onClick={() => setScope("input")}
          >
            This field
          </button>
          <button
            type="button"
            className={`cj-btn cj-btn--xs ${scope === "global" ? "cj-btn--default" : "cj-btn--outline"}`}
            onClick={() => setScope("global")}
          >
            Global
          </button>
        </div>

        <div className="clipject-form-actions">
          <button
            type="button"
            className="cj-btn cj-btn--ghost cj-btn--xs"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cj-btn cj-btn--default cj-btn--xs"
            disabled={!value.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
