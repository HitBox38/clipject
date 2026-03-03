import { useCallback, useRef } from "react";
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
import { validateExportPayload } from "@/lib/import-validation";
import { useImportExportStore } from "@/options/stores/import-export-store";

/**
 * Settings section: export the entire DB as JSON, or import from a file.
 */
export function ImportExportSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exporting = useImportExportStore((s) => s.exporting);
  const strategy = useImportExportStore((s) => s.strategy);
  const pendingPayload = useImportExportStore((s) => s.pendingPayload);
  const importError = useImportExportStore((s) => s.importError);
  const importResult = useImportExportStore((s) => s.importResult);
  const confirmOpen = useImportExportStore((s) => s.confirmOpen);

  const setStrategy = useImportExportStore((s) => s.setStrategy);
  const runExport = useImportExportStore((s) => s.runExport);
  const fileValid = useImportExportStore((s) => s.fileValid);
  const fileError = useImportExportStore((s) => s.fileError);
  const clearImportMessage = useImportExportStore((s) => s.clearImportMessage);
  const cancelImport = useImportExportStore((s) => s.cancelImport);
  const confirmImport = useImportExportStore((s) => s.confirmImport);

  const handleExport = useCallback(() => {
    void runExport();
  }, [runExport]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearImportMessage();
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (typeof reader.result !== "string") {
            fileError("The selected file could not be parsed as text.");
            return;
          }
          const raw: unknown = JSON.parse(reader.result);
          const result = validateExportPayload(raw);
          if (!result.ok) {
            fileError(result.error);
            return;
          }
          fileValid(result.payload);
        } catch {
          fileError("The selected file is not valid JSON.");
        }
      };
      reader.onerror = () => fileError("Failed to read the file.");
      reader.readAsText(file);
      e.target.value = "";
    },
    [clearImportMessage, fileError, fileValid],
  );

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

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={exporting}
        onClick={handleExport}
      >
        {exporting ? "Exporting..." : "Export data"}
      </Button>

      <Separator />

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
            <AlertDialogCancel onClick={cancelImport}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmImport()}>
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
