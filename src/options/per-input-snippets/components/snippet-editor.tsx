import { useCallback, useState } from "react";
import type { InputMeta, PageMeta, Snippet } from "@/types/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { encodeShareString } from "@/lib/sharing";
import { CopySnippetButton } from "@/components/copy-snippet-button";
import { MAX_DISPLAY_LENGTH } from "../constants";

interface Props {
  snippet: Snippet;
  compositeKey: string;
  /** Page metadata — needed to build the share string. */
  pageMeta?: PageMeta;
  /** Input metadata — needed to build the share string. */
  inputMeta?: InputMeta;
  onEdit: (
    compositeKey: string,
    snippetId: string,
    patch: Partial<Pick<Snippet, "value" | "label">>,
  ) => Promise<void>;
  onDelete: (compositeKey: string, snippetId: string) => Promise<void>;
}

export function SnippetEditor({
  snippet,
  compositeKey,
  pageMeta,
  inputMeta,
  onEdit,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(snippet.value);
  const [editLabel, setEditLabel] = useState(snippet.label ?? "");
  const [copied, setCopied] = useState(false);

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
      await onEdit(compositeKey, snippet.id, {
        value: trimmedValue,
        label: editLabel.trim(),
      });
      setEditing(false);
    } catch {
      setError("Couldn’t save. Your draft is still here. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [saving, editValue, editLabel, compositeKey, snippet.id, onEdit]);

  const handleCancel = useCallback(() => {
    setEditValue(snippet.value);
    setEditLabel(snippet.label ?? "");
    setEditing(false);
  }, [snippet]);

  const handleShare = useCallback(async () => {
    if (!pageMeta || !inputMeta) return;

    const shareStr = encodeShareString({
      type: "per-input-snippet",
      page: pageMeta,
      input: inputMeta,
      snippet,
    });

    try {
      await navigator.clipboard.writeText(shareStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn’t copy the share code. Please try again.");
    }
  }, [pageMeta, inputMeta, snippet]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onDelete(compositeKey, snippet.id);
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
        {pageMeta && inputMeta && (
          <Button variant="ghost" size="xs" onClick={() => void handleShare()}>
            {copied ? "Copied" : "Share"}
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
