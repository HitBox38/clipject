import { useCallback, useMemo, useState } from "react";
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

/**
 * Settings section: clone all snippets from one per-input entry to
 * a different domain/pathname/input.
 */
export function CloneEntrySection() {
  const perInputDb = useOptionsStore((s) => s.perInputDb);
  const cloneEntry = useOptionsStore((s) => s.cloneEntry);

  // Group entries for the source picker.
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

  // --- state ---
  const [sourceKey, setSourceKey] = useState<string>("");
  const [targetOrigin, setTargetOrigin] = useState("");
  const [targetPathname, setTargetPathname] = useState("");
  const [targetInputSig, setTargetInputSig] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  const sourceEntry = sourceKey ? perInputDb[sourceKey] ?? null : null;

  // Pre-fill target fields when a source is selected.
  const handleSourceChange = useCallback(
    (key: string) => {
      setSourceKey(key);
      setError(null);
      setSuccess(null);

      const entry = perInputDb[key];
      if (entry) {
        // Default target to same pathname / input sig — user typically only
        // changes the origin.
        setTargetPathname(entry.page.pathname);
        setTargetInputSig(entry.input.signature);
      }
    },
    [perInputDb],
  );

  const handleClone = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!sourceKey) {
      setError("Select a source entry first.");
      return;
    }

    const trimmedOrigin = targetOrigin.trim();
    if (!trimmedOrigin) {
      setError("Target origin is required.");
      return;
    }

    // Basic origin validation (must look like a protocol + host).
    try {
      const url = new URL(trimmedOrigin);
      if (url.origin !== trimmedOrigin) {
        setError(
          `Origin should not have a trailing path. Did you mean "${url.origin}"?`,
        );
        return;
      }
    } catch {
      setError(
        'Target origin must be a valid URL origin (e.g. "https://example.com").',
      );
      return;
    }

    const trimmedPathname = targetPathname.trim() || "/";
    const trimmedSig = targetInputSig.trim() || undefined;

    setCloning(true);
    try {
      const count = await cloneEntry(
        sourceKey,
        trimmedOrigin,
        trimmedPathname,
        trimmedSig,
      );
      setSuccess(`Cloned ${count} snippet(s) to ${trimmedOrigin}${trimmedPathname}.`);
      setSourceKey("");
      setTargetOrigin("");
      setTargetPathname("");
      setTargetInputSig("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Clone failed unexpectedly.",
      );
    } finally {
      setCloning(false);
    }
  }, [sourceKey, targetOrigin, targetPathname, targetInputSig, cloneEntry]);

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

      {/* Source picker */}
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

      {/* Target fields */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clone-origin">Target origin</Label>
          <Input
            id="clone-origin"
            placeholder="https://other-site.com"
            value={targetOrigin}
            onChange={(e) => {
              setTargetOrigin(e.target.value);
              setError(null);
              setSuccess(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clone-pathname">Target pathname</Label>
          <Input
            id="clone-pathname"
            placeholder="/form"
            value={targetPathname}
            onChange={(e) => {
              setTargetPathname(e.target.value);
              setError(null);
              setSuccess(null);
            }}
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
            onChange={(e) => {
              setTargetInputSig(e.target.value);
              setError(null);
              setSuccess(null);
            }}
          />
        </div>
      </div>

      <Button
        size="sm"
        className="self-start"
        disabled={cloning || !sourceKey || !targetOrigin.trim()}
        onClick={() => void handleClone()}
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
