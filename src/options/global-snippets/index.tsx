import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGlobalSnippets } from "./hooks/use-global-snippets";
import { SnippetTable } from "./components/snippet-table";
import { AddSnippetDialog } from "./components/add-snippet-dialog";

export function GlobalSnippetsPage() {
  const {
    globalSnippets,
    addGlobalSnippet,
    removeGlobalSnippet,
    editGlobalSnippet,
  } = useGlobalSnippets();
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const filtered = globalSnippets.filter((snippet) =>
    ((snippet.label ?? "") + " " + snippet.value)
      .toLocaleLowerCase()
      .includes(search),
  );
  return (
    <section className="page-stack" aria-labelledby="global-title">
      <header className="page-heading">
        <h1 id="global-title">Global snippets</h1>
        <p>Available in every field you select with ClipJect.</p>
      </header>
      <div className="library-toolbar">
        <Input
          type="search"
          aria-label="Search global snippets"
          placeholder="Filter snippets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="library-search"
        />
        <AddSnippetDialog onAdd={addGlobalSnippet} />
      </div>
      <div className="collection-summary" role="status">
        <span>
          {search ? filtered.length + " of " : ""}
          {globalSnippets.length} snippet
          {globalSnippets.length === 1 ? "" : "s"}
        </span>
        <span>Global · all selected fields</span>
      </div>
      {globalSnippets.length > 0 && filtered.length === 0 ? (
        <div className="empty-state">
          <h2>No snippets match your search</h2>
          <p>Try another word or clear the search to see your library.</p>
          <Button variant="outline" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <SnippetTable
          snippets={filtered}
          onDelete={removeGlobalSnippet}
          onEdit={editGlobalSnippet}
        />
      )}
    </section>
  );
}
