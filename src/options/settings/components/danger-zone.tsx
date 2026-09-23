import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useOptionsStore } from "@/options/stores/options-store";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const clearAll = useOptionsStore((s) => s.clearAll);

  const handleClear = async () => {
    setBusy(true);
    setError("");
    try {
      await clearAll();
      setOpen(false);
      setDone(true);
    } catch {
      setError("Couldn’t delete the data. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 items-center justify-between rounded-xl border border-destructive/30 bg-card p-6">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Delete all data</p>
          <p className="text-xs text-muted-foreground">
            Permanently removes global snippets, field snippets, and selected
            fields. This cannot be undone.
          </p>
        </div>

        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (!busy) {
              setOpen(next);
              setError("");
            }
          }}
        >
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                Delete all
              </Button>
            }
          />
          <AlertDialogContent>
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all saved data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all snippets and selected fields.
                Your appearance and enabled preference are kept. Export a backup
                first if you want to restore your library later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => void handleClear()}
              >
                {busy ? "Deleting…" : "Delete all data"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {done && (
        <p role="status" className="text-sm text-muted-foreground">
          All snippets and selected fields have been deleted.
        </p>
      )}
    </div>
  );
}
