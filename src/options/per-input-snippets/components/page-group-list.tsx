import type { PageGroup } from "../types";

interface Props {
  groups: PageGroup[];
  onSelectEntry: (compositeKey: string) => void;
}

export function PageGroupList({ groups, onSelectEntry }: Props) {
  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <h2>No field snippets</h2>
        <p>
          Open ClipJect on a webpage, choose Select a field, then save text for
          that field. It will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="page-directory">
      {groups.map((group) => (
        <section key={group.pageKey} className="page-directory-group">
          <header className="page-directory-heading">
            <h2>{group.entries[0][1].page.titleLastSeen || "Untitled page"}</h2>
            <p>
              {group.entries[0][1].page.origin}
              {group.entries[0][1].page.pathname}
            </p>
          </header>
          <div className="field-directory">
            {group.entries.map(([compositeKey, entry]) => {
              const count = entry.snippets.length;
              return (
                <button
                  key={compositeKey}
                  type="button"
                  className="field-directory-row"
                  onClick={() => onSelectEntry(compositeKey)}
                >
                  <span className="text-sm flex-1 truncate min-w-0">
                    {entry.input.signature.replace(/^[^:]+:/, "")}
                  </span>
                  <span className="field-count">
                    {count} snippet{count !== 1 ? "s" : ""}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
