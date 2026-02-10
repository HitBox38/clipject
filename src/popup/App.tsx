import { useCallback, useEffect, useState } from "react";
import { ext } from "@/lib/ext";
import { getEnabled, getGlobalSnippets, getPerInputDb, setEnabled } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useThemeInit } from "@/components/theme-switcher";

export function PopupApp() {
  useThemeInit();
  const [enabled, setEnabledState] = useState(true);
  const [globalCount, setGlobalCount] = useState(0);
  const [inputCount, setInputCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [isEnabled, globals, db] = await Promise.all([
        getEnabled(),
        getGlobalSnippets(),
        getPerInputDb(),
      ]);
      setEnabledState(isEnabled);
      setGlobalCount(globals.length);

      const totalInputSnippets = Object.values(db).reduce(
        (sum, entry) => sum + entry.snippets.length,
        0,
      );
      setInputCount(totalInputSnippets);
      setLoaded(true);
    }
    void load();
  }, []);

  const handleToggle = useCallback(async () => {
    const next = !enabled;
    setEnabledState(next);
    await setEnabled(next);
  }, [enabled]);

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
      </div>

      <Separator />

      {/* Actions */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleOpenOptions}
      >
        Open Options
      </Button>
    </div>
  );
}
