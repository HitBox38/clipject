import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Per-Input Snippets</CardTitle>
          <CardDescription>
            Snippets saved for specific input fields on specific pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <PageGroupList
              groups={pageGroups}
              onSelectEntry={selectEntry}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
