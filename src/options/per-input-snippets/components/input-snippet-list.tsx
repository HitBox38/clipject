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

      <div className="flex flex-col gap-1 px-1">
        <p className="text-sm font-medium">
          {entry.page.origin}
          {entry.page.pathname}
        </p>
        <p className="text-xs text-muted-foreground">
          Title: {entry.page.titleLastSeen}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {entry.input.tag}
            {entry.input.type ? `[${entry.input.type}]` : ""}
          </Badge>
          <Badge
            variant={sigStrategy === "path" ? "destructive" : "secondary"}
            className="text-xs"
          >
            {sigStrategy}: {sigValue}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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

      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteEntry(compositeKey)}
        >
          Delete all snippets for this input
        </Button>
      </div>
    </div>
  );
}
