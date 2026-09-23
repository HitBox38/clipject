import { useCallback, useState } from "react";
import type { GlobalSnippet } from "@/types/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopySnippetButton } from "@/components/copy-snippet-button";
import { MAX_DISPLAY_LENGTH } from "../constants";

interface Props {
  snippet: GlobalSnippet;
  onDelete: (id: string) => Promise<void>;
  onEdit: (
    id: string,
    patch: Partial<Pick<GlobalSnippet, "value" | "label">>,
  ) => Promise<void>;
}

export function SnippetRow({ snippet, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(snippet.value);
  const [editLabel, setEditLabel] = useState(snippet.label ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue || saving) return;
    setSaving(true);
    setError("");
    try {
      await onEdit(snippet.id, {
        value: trimmedValue,
        label: editLabel.trim(),
      });
      setEditing(false);
    } catch {
      setError("Couldn’t save. Your draft is still here. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [saving, editValue, editLabel, snippet.id, onEdit]);

  const handleCancel = useCallback(() => {
    setEditValue(snippet.value);
    setEditLabel(snippet.label ?? "");
    setEditing(false);
  }, [snippet]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onDelete(snippet.id);
    } catch {
      setError("Couldn’t delete this snippet. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="snippet-editor">
        <Input
          aria-label="Snippet label"
          placeholder="Label (optional)"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
        />
        <Textarea
          aria-label="Snippet text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="min-h-32"
        />
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end" aria-busy={saving}>
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!editValue.trim() || saving}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  const display =
    !expanded && snippet.value.length > MAX_DISPLAY_LENGTH
      ? `${snippet.value.slice(0, MAX_DISPLAY_LENGTH)}...`
      : snippet.value;

  return (
    <div className="snippet-record">
      <div className="snippet-label-cell">
        <p className="snippet-label">{snippet.label || "Untitled"}</p>
        <span className="snippet-length">
          {snippet.value.length.toLocaleString()} characters
        </span>
      </div>
      <div className="snippet-text-cell">
        <p className="snippet-preview">{display}</p>
        {snippet.value.length > MAX_DISPLAY_LENGTH && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show full snippet"}
          </button>
        )}
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
      </div>
      <div className="snippet-actions">
        <CopySnippetButton value={snippet.value} onError={setError} />
        {confirmDelete && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
        )}
        <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          variant={confirmDelete ? "destructive" : "ghost"}
          size="xs"
          disabled={saving}
          onClick={() => void handleDelete()}
        >
          {confirmDelete ? "Confirm delete" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
