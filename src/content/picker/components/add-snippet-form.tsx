import { useCallback, useState } from "react";

interface Props {
  onSave: (
    value: string,
    label: string,
    scope: "input" | "global",
  ) => Promise<void>;
  onCancel: () => void;
}

export const AddSnippetForm = ({ onSave, onCancel }: Props) => {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"input" | "global">("input");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(trimmed, label.trim(), scope);
    } catch {
      setError("Couldn’t save. Your draft is still here. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [value, label, scope, onSave, saving]);

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
          autoFocus
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

      {error && (
        <p role="alert" className="clipject-feedback">
          {error}
        </p>
      )}
      <p className="clipject-subtitle">
        {scope === "input"
          ? "Available only in this field on this page."
          : "Available in all fields you select with ClipJect."}
      </p>
      <div className="clipject-form-row">
        <div className="clipject-scope">
          <button
            type="button"
            className={`cj-btn cj-btn--xs ${scope === "input" ? "cj-btn--default" : "cj-btn--outline"}`}
            aria-pressed={scope === "input"}
            onClick={() => setScope("input")}
          >
            This field
          </button>
          <button
            type="button"
            className={`cj-btn cj-btn--xs ${scope === "global" ? "cj-btn--default" : "cj-btn--outline"}`}
            aria-pressed={scope === "global"}
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
            disabled={!value.trim() || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
};
