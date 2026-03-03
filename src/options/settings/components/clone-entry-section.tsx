import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useOptionsStore,
  groupEntriesByPage,
} from "@/options/stores/options-store";
import { useCloneEntryStore } from "@/options/stores/clone-entry-store";

/**
 * Settings section: clone all snippets from one per-input entry to
 * a different domain/pathname/input.
 */
export function CloneEntrySection() {
  const perInputDb = useOptionsStore((s) => s.perInputDb);
  const sourceKey = useCloneEntryStore((s) => s.sourceKey);
  const targetOrigin = useCloneEntryStore((s) => s.targetOrigin);
  const targetPathname = useCloneEntryStore((s) => s.targetPathname);
  const targetInputSig = useCloneEntryStore((s) => s.targetInputSig);
  const error = useCloneEntryStore((s) => s.error);
  const success = useCloneEntryStore((s) => s.success);
  const cloning = useCloneEntryStore((s) => s.cloning);

  const setSource = useCloneEntryStore((s) => s.setSource);
  const setTargetOrigin = useCloneEntryStore((s) => s.setTargetOrigin);
  const setTargetPathname = useCloneEntryStore((s) => s.setTargetPathname);
  const setTargetInputSig = useCloneEntryStore((s) => s.setTargetInputSig);
  const runClone = useCloneEntryStore((s) => s.runClone);

  const groups = useMemo(() => {
    const map = groupEntriesByPage(perInputDb);
    return Array.from(map.entries()).map(([pageKey, group]) => ({
      pageKey,
      ...group,
    }));
  }, [perInputDb]);

  const allEntries = useMemo(
    () => groups.flatMap((g) => g.entries),
    [groups],
  );

  const sourceEntry = sourceKey ? perInputDb[sourceKey] ?? null : null;

  const handleSourceChange = useCallback(
    (key: string | null) => {
      if (!key) {
        setSource("");
        return;
      }
      const entry = perInputDb[key];
      setSource(key, entry?.page.pathname, entry?.input.signature);
    },
    [perInputDb, setSource],
  );

  const handleClone = useCallback(() => {
    void runClone();
  }, [runClone]);

  if (allEntries.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Clone to another domain</p>
          <p className="text-xs text-muted-foreground">
            No per-input entries to clone. Save some snippets first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Clone to another domain</p>
        <p className="text-xs text-muted-foreground">
          Copy all snippets from a per-input entry to a different origin,
          pathname, or input field.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clone-source">Source</Label>
        <Select value={sourceKey} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a source entry..." />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.pageKey}>
                <SelectLabel>{group.pageLabel}</SelectLabel>
                {group.entries.map(([key, entry]) => (
                  <SelectItem key={key} value={key}>
                    {entry.input.signature}{" "}
                    <span className="text-muted-foreground">
                      ({entry.snippets.length} snippet
                      {entry.snippets.length !== 1 ? "s" : ""})
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sourceEntry && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary">
            {sourceEntry.page.origin}
            {sourceEntry.page.pathname}
          </Badge>
          <Badge variant="secondary">{sourceEntry.input.signature}</Badge>
          <Badge variant="secondary">
            {sourceEntry.snippets.length} snippet(s)
          </Badge>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clone-origin">Target origin</Label>
          <Input
            id="clone-origin"
            placeholder="https://other-site.com"
            value={targetOrigin}
            onChange={(e) => setTargetOrigin(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clone-pathname">Target pathname</Label>
          <Input
            id="clone-pathname"
            placeholder="/form"
            value={targetPathname}
            onChange={(e) => setTargetPathname(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clone-input-sig">
            Target input signature{" "}
            <span className="text-muted-foreground font-normal">
              (defaults to source)
            </span>
          </Label>
          <Input
            id="clone-input-sig"
            placeholder="id:email"
            value={targetInputSig}
            onChange={(e) => setTargetInputSig(e.target.value)}
          />
        </div>
      </div>

      <Button
        size="sm"
        className="self-start"
        disabled={cloning || !sourceKey || !targetOrigin.trim()}
        onClick={handleClone}
      >
        {cloning ? "Cloning..." : "Clone snippets"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
      )}
    </div>
  );
}
