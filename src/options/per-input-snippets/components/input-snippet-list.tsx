import { useState } from "react";
import type { InputEntry, Snippet } from "@/types/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SnippetEditor } from "./snippet-editor";

interface Props {
  compositeKey: string;
  entry: InputEntry;
  onEditSnippet: (
    compositeKey: string,
    snippetId: string,
    patch: Partial<Pick<Snippet, "value" | "label">>,
  ) => Promise<void>;
  onDeleteSnippet: (compositeKey: string, snippetId: string) => Promise<void>;
  onDeleteEntry: (compositeKey: string) => Promise<void>;
  onBack: () => void;
}

export function InputSnippetList({
  compositeKey,
  entry,
  onEditSnippet,
  onDeleteSnippet,
  onDeleteEntry,
  onBack,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onDeleteEntry(compositeKey);
    } catch {
      setError("Couldn’t delete these snippets. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const sigParts = entry.input.signature.split(":");
  const sigStrategy = sigParts[0];
  const sigValue = sigParts.slice(1).join(":");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back
        </Button>
      </div>

      <div className="field-context">
        <p className="text-sm font-medium">
          {entry.page.origin}
          {entry.page.pathname}
        </p>
        <p className="text-xs text-muted-foreground">
          Title: {entry.page.titleLastSeen}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className="text-xs max-w-full whitespace-normal break-all"
          >
            {entry.input.tag}
            {entry.input.type ? `[${entry.input.type}]` : ""}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {sigStrategy}: {sigValue}
          </Badge>
        </div>
      </div>

      <div className="snippet-table">
        {entry.snippets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No snippets for this input.
          </p>
        ) : (
          entry.snippets.map((s) => (
            <SnippetEditor
              key={s.id}
              snippet={s}
              compositeKey={compositeKey}
              pageMeta={entry.page}
              inputMeta={entry.input}
              onEdit={onEditSnippet}
              onDelete={onDeleteSnippet}
            />
          ))
        )}
      </div>

      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        {confirmDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => void handleDelete()}
        >
          {confirmDelete
            ? "Confirm delete all field snippets"
            : "Delete all snippets for this field"}
        </Button>
      </div>
    </div>
  );
}
