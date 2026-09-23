import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePerInputSnippets } from "./hooks/use-per-input-snippets";
import { PageGroupList } from "./components/page-group-list";
import { InputSnippetList } from "./components/input-snippet-list";
export function PerInputSnippetsPage() {
  const {
    pageGroups,
    selectedEntryKey,
    selectedEntry,
    selectEntry,
    removeInputSnippet,
    editInputSnippet,
    removeInputEntry,
  } = usePerInputSnippets();
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const groups = pageGroups
    .map((group) => ({
      ...group,
      entries: group.entries.filter(([, entry]) =>
        [
          group.pageLabel,
          entry.input.signature,
          ...entry.snippets.map((s) => (s.label ?? "") + " " + s.value),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search),
      ),
    }))
    .filter((group) => group.entries.length > 0);
  return (
    <section className="page-stack" aria-labelledby="fields-title">
      <header className="page-heading">
        <h1 id="fields-title">Field snippets</h1>
        <p>Available only in the field and page where you saved them.</p>
      </header>
      {selectedEntryKey && selectedEntry ? (
        <InputSnippetList
          compositeKey={selectedEntryKey}
          entry={selectedEntry}
          onEditSnippet={editInputSnippet}
          onDeleteSnippet={removeInputSnippet}
          onDeleteEntry={removeInputEntry}
          onBack={() => selectEntry(null)}
        />
      ) : (
        <>
          {pageGroups.length > 0 && (
            <div className="library-toolbar">
              <Input
                type="search"
                aria-label="Search field snippets"
                placeholder="Filter pages, fields, or text…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="library-search"
              />
              <span className="result-count" role="status">
                {groups.length} page{groups.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {pageGroups.length > 0 && groups.length === 0 ? (
            <div className="empty-state">
              <h2>No matching fields</h2>
              <p>Try a page name, field name, or a word from your snippet.</p>
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <PageGroupList groups={groups} onSelectEntry={selectEntry} />
          )}
        </>
      )}
    </section>
  );
}
