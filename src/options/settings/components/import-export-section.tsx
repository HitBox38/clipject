import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportAllData } from "@/lib/storage";
import { validateExportPayload } from "@/lib/import-validation";
import { useOptionsStore } from "@/options/stores/options-store";
import type { ClipjectExportPayload, ImportResult } from "@/types/storage";

type ImportStrategy = "merge" | "replace";

/**
 * Settings section: export the entire DB as JSON, or import from a file.
 */
export function ImportExportSection() {
  const importData = useOptionsStore((s) => s.importData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- export ---
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const payload = await exportAllData();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clipject-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, []);

  // --- import ---
  const [strategy, setStrategy] = useState<ImportStrategy>("merge");
  const [pendingPayload, setPendingPayload] =
    useState<ClipjectExportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setImportError(null);
      setImportResult(null);

      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (typeof reader.result !== "string") {
            setImportError("The selected file could not be parsed as text.");
            return;
          }

          const raw: unknown = JSON.parse(reader.result);
          const result = validateExportPayload(raw);
          if (!result.ok) {
            setImportError(result.error);
            return;
          }
          setPendingPayload(result.payload);
          setConfirmOpen(true);
        } catch {
          setImportError("The selected file is not valid JSON.");
        }
      };
      reader.onerror = () => setImportError("Failed to read the file.");
      reader.readAsText(file);

      // Reset the input so selecting the same file again triggers onChange.
      e.target.value = "";
    },
    [],
  );

  const handleConfirmImport = useCallback(async () => {
    if (!pendingPayload) return;
    try {
      const result = await importData(pendingPayload, strategy);
      setImportResult(result);
      setPendingPayload(null);
      setConfirmOpen(false);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed unexpectedly.",
      );
      setConfirmOpen(false);
    }
  }, [pendingPayload, strategy, importData]);

  const handleCancelImport = useCallback(() => {
    setPendingPayload(null);
    setConfirmOpen(false);
  }, []);

  const summaryText = pendingPayload
    ? [
        `${pendingPayload.data.globalSnippets.length} global snippet(s)`,
        `${Object.keys(pendingPayload.data.perInputDb).length} per-input entry(-ies)`,
        `${pendingPayload.data.trackedInputs.length} tracked input(s)`,
      ].join(", ")
    : "";

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Import / Export</p>
        <p className="text-xs text-muted-foreground">
          Export your entire snippet database as a JSON file, or import one to
          restore or share data.
        </p>
      </div>

      {/* Export */}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={exporting}
        onClick={() => void handleExport()}
      >
        {exporting ? "Exporting..." : "Export data"}
      </Button>

      <Separator />

      {/* Import */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium">Import strategy</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="radio"
              name="import-strategy"
              value="merge"
              checked={strategy === "merge"}
              onChange={() => setStrategy("merge")}
              className="accent-primary"
            />
            Merge (add to existing)
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="radio"
              name="import-strategy"
              value="replace"
              checked={strategy === "replace"}
              onChange={() => setStrategy("replace")}
              className="accent-primary"
            />
            Replace (overwrite all)
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file to import
        </Button>

        {importError && (
          <p className="text-xs text-destructive">{importError}</p>
        )}

        {importResult && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Import complete: {importResult.globalSnippets} global snippet(s),{" "}
            {importResult.perInputEntries} per-input entry(-ies),{" "}
            {importResult.trackedInputs} tracked input(s).
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm import</AlertDialogTitle>
            <AlertDialogDescription>
              The file contains {summaryText}. Strategy:{" "}
              <strong>{strategy}</strong>.
              {strategy === "replace" && (
                <>
                  {" "}
                  This will <strong>wipe all existing data</strong> first.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelImport}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmImport()}>
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
