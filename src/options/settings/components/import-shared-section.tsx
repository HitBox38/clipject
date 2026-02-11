import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { decodeShareString, importSharedSnippet } from "@/lib/sharing";
import { useOptionsStore } from "@/options/stores/options-store";
import type { SharedSnippetPayload } from "@/types/storage";

/**
 * Settings section: paste a `clipject:share:v1:...` string to import a
 * single per-input snippet that someone else shared with you.
 */
export function ImportSharedSection() {
  const loadAll = useOptionsStore((s) => s.loadAll);

  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<SharedSnippetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDecode = useCallback(() => {
    setError(null);
    setSuccess(false);
    setPreview(null);

    if (!raw.trim()) {
      setError("Paste a share string first.");
      return;
    }

    const result = decodeShareString(raw);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPreview(result.payload);
  }, [raw]);

  const handleImport = useCallback(async () => {
    if (!preview) return;
    try {
      await importSharedSnippet(preview);
      await loadAll();
      setSuccess(true);
      setPreview(null);
      setRaw("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed unexpectedly.",
      );
    }
  }, [preview, loadAll]);

  const handleClear = useCallback(() => {
    setRaw("");
    setPreview(null);
    setError(null);
    setSuccess(false);
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Import shared snippet</p>
        <p className="text-xs text-muted-foreground">
          Paste a share string you received from someone to import a snippet
          into the correct page and input field.
        </p>
      </div>

      <Textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setPreview(null);
          setError(null);
          setSuccess(false);
        }}
        placeholder="clipject:share:v1:..."
        className="min-h-[60px] font-mono text-xs"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecode}
          disabled={!raw.trim()}
        >
          Preview
        </Button>
        {(preview || raw) && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {preview && (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-xs">
          <p className="font-medium">Preview</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {preview.page.origin}
              {preview.page.pathname}
            </Badge>
            <Badge variant="secondary">{preview.input.signature}</Badge>
          </div>
          {preview.snippet.label && (
            <p>
              <span className="text-muted-foreground">Label:</span>{" "}
              {preview.snippet.label}
            </p>
          )}
          <p className="break-all">
            <span className="text-muted-foreground">Value:</span>{" "}
            {preview.snippet.value.length > 200
              ? `${preview.snippet.value.slice(0, 200)}...`
              : preview.snippet.value}
          </p>
          <Button
            size="sm"
            className="self-start"
            onClick={() => void handleImport()}
          >
            Import this snippet
          </Button>
        </div>
      )}

      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Snippet imported successfully.
        </p>
      )}
    </div>
  );
}
