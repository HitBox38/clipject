import type { PageGroup } from "../types";
import { Badge } from "@/components/ui/badge";

interface Props {
  groups: PageGroup[];
  onSelectEntry: (compositeKey: string) => void;
}

export function PageGroupList({ groups, onSelectEntry }: Props) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No per-input snippets saved yet. Focus an input field on any page and
        save a snippet to see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.pageKey} className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground px-1 truncate">
            {group.pageLabel}
          </p>
          <div className="flex flex-col gap-1">
            {group.entries.map(([compositeKey, entry]) => {
              const count = entry.snippets.length;
              return (
                <button
                  key={compositeKey}
                  type="button"
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-muted/50 transition-colors w-full"
                  onClick={() => onSelectEntry(compositeKey)}
                >
                  <span className="text-sm flex-1 truncate min-w-0">
                    {entry.input.signature}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {count} snippet{count !== 1 ? "s" : ""}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
