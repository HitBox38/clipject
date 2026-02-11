import { useCallback, useState } from "react";
import type { InputMeta, PageMeta, Snippet } from "@/types/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { encodeShareString } from "@/lib/sharing";
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

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) return;
    await onEdit(compositeKey, snippet.id, {
      value: trimmedValue,
      label: editLabel.trim() || undefined,
    });
    setEditing(false);
  }, [editValue, editLabel, compositeKey, snippet.id, onEdit]);

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

    await navigator.clipboard.writeText(shareStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pageMeta, inputMeta, snippet]);

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <Input
          placeholder="Label (optional)"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
        />
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="min-h-[60px]"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!editValue.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  const display =
    snippet.value.length > MAX_DISPLAY_LENGTH
      ? `${snippet.value.slice(0, MAX_DISPLAY_LENGTH)}...`
      : snippet.value;

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 group">
      <div className="flex-1 min-w-0">
        {snippet.label && (
          <p className="text-sm font-medium mb-0.5">{snippet.label}</p>
        )}
        <p className="text-sm text-muted-foreground break-all">{display}</p>
      </div>
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {pageMeta && inputMeta && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => void handleShare()}
          >
            {copied ? "Copied!" : "Share"}
          </Button>
        )}
        <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          variant="destructive"
          size="xs"
          onClick={() => onDelete(compositeKey, snippet.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
