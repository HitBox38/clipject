import type { GlobalSnippet } from "@/types/storage";
import { SnippetRow } from "./snippet-row";

interface Props {
  snippets: GlobalSnippet[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (
    id: string,
    patch: Partial<Pick<GlobalSnippet, "value" | "label">>,
  ) => Promise<void>;
}

export function SnippetTable({ snippets, onDelete, onEdit }: Props) {
  if (snippets.length === 0) {
    return (
      <div className="empty-state">
        <h2>No global snippets</h2>
        <p>
          Use New snippet to save text you want available across selected
          fields.
        </p>
      </div>
    );
  }

  return (
    <div className="snippet-table">
      <div className="snippet-column-headings" aria-hidden="true">
        <span>Label</span>
        <span>Text</span>
        <span>Actions</span>
      </div>
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
