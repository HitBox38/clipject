import { useCallback, useEffect, useState } from "react";
import { ext } from "@/lib/ext";
import {
  getEnabled,
  getGlobalSnippets,
  getPerInputDb,
  getTrackedInputs,
  setEnabled,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useThemeInit } from "@/components/theme-switcher";
import type { StartElementSelectionMessage } from "@/types/messages";

export function PopupApp() {
  useThemeInit();
  const [enabled, setEnabledState] = useState(true);
  const [globalCount, setGlobalCount] = useState(0);
  const [inputCount, setInputCount] = useState(0);
  const [trackedCount, setTrackedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [isEnabled, globals, db, tracked] = await Promise.all([
        getEnabled(),
        getGlobalSnippets(),
        getPerInputDb(),
        getTrackedInputs(),
      ]);
      setEnabledState(isEnabled);
      setGlobalCount(globals.length);

      const totalInputSnippets = Object.values(db).reduce(
        (sum, entry) => sum + entry.snippets.length,
        0,
      );
      setInputCount(totalInputSnippets);
      setTrackedCount(tracked.length);
      setLoaded(true);
    }
    void load();
  }, []);

  const handleToggle = useCallback(async () => {
    const next = !enabled;
    setEnabledState(next);
    await setEnabled(next);
  }, [enabled]);

  const handleSelectElement = useCallback(async () => {
    const [tab] = await ext.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    const message: StartElementSelectionMessage = {
      type: "CLIPJECT_START_ELEMENT_SELECTION",
    };
    await ext.tabs.sendMessage(tab.id, message);

    // Close popup so the user can interact with the page.
    window.close();
  }, []);

  const handleOpenOptions = useCallback(() => {
    ext.runtime.openOptionsPage();
  }, []);

  if (!loaded) {
    return (
      <div className="flex w-[280px] items-center justify-center p-4 bg-background text-foreground">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex w-[280px] flex-col gap-3 bg-background p-4 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">ClipJect</h1>
        <Button
          variant={enabled ? "default" : "outline"}
          size="xs"
          onClick={handleToggle}
        >
          {enabled ? "Enabled" : "Disabled"}
        </Button>
      </div>

      <Separator />

      {/* Stats */}
      <div className="flex gap-4 text-center">
        <div className="flex-1">
          <p className="text-lg font-semibold">{globalCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Global
          </p>
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{inputCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Per-input
          </p>
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{trackedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Tracked
          </p>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={handleSelectElement}
        >
          <CrosshairIcon />
          Select Element
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleOpenOptions}
        >
          Open Options
        </Button>
      </div>
    </div>
  );
}

/** Minimal crosshair icon (no dependency on lucide-react). */
function CrosshairIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}
