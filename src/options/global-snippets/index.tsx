import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Snippets</CardTitle>
          <CardDescription>
            These snippets are available in every input field on every page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddSnippetDialog onAdd={addGlobalSnippet} />
          <SnippetTable
            snippets={globalSnippets}
            onDelete={removeGlobalSnippet}
            onEdit={editGlobalSnippet}
          />
        </CardContent>
      </Card>
    </div>
  );
}
