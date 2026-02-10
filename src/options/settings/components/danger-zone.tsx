import {
  AlertDialog,
  AlertDialogAction,
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
  const clearAll = useOptionsStore((s) => s.clearAll);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Delete all data</p>
          <p className="text-xs text-muted-foreground">
            Permanently removes all saved snippets (both global and per-input).
            This cannot be undone.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                Delete all
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your saved snippets, both global
                and per-input. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void clearAll()}
              >
                Yes, delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
