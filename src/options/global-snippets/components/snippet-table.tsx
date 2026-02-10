import type { GlobalSnippet } from "@/types/storage";
import { SnippetRow } from "./snippet-row";

interface Props {
  snippets: GlobalSnippet[];
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    patch: Partial<Pick<GlobalSnippet, "value" | "label">>,
  ) => void;
}

export function SnippetTable({ snippets, onDelete, onEdit }: Props) {
  if (snippets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No global snippets yet. Add one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {snippets.map((s) => (
        <SnippetRow
          key={s.id}
          snippet={s}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
