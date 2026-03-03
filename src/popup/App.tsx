import { useCallback, useEffect } from "react";
import { ext } from "@/lib/ext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { StartElementSelectionMessage } from "@/types/messages";
import { useThemeInit } from "@/components/theme-switcher/hooks/use-theme-init";
import { usePopupStore } from "./stores/popup-store";

export function PopupApp() {
  useThemeInit();

  const loaded = usePopupStore((s) => s.loaded);
  const enabled = usePopupStore((s) => s.enabled);
  const globalCount = usePopupStore((s) => s.globalCount);
  const inputCount = usePopupStore((s) => s.inputCount);
  const trackedCount = usePopupStore((s) => s.trackedCount);
  const loadStats = usePopupStore((s) => s.loadStats);
  const toggleEnabled = usePopupStore((s) => s.toggleEnabled);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleToggle = useCallback(() => {
    void toggleEnabled();
  }, [toggleEnabled]);

  const handleSelectElement = useCallback(async () => {
    const [tab] = await ext.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    const tabId = tab.id;
    const message: StartElementSelectionMessage = {
      type: "CLIPJECT_START_ELEMENT_SELECTION",
    };

    if (await trySendMessage(tabId, message)) {
      window.close();
      return;
    }

    const injected = await injectContentScript(tabId);
    if (injected && (await trySendMessage(tabId, message))) {
      window.close();
      return;
    }

    console.warn("[ClipJect] Cannot reach content script on this tab.");
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

async function trySendMessage(
  tabId: number,
  message: StartElementSelectionMessage,
): Promise<boolean> {
  try {
    await ext.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    return false;
  }
}

async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    const manifest = ext.runtime.getManifest();
    const files = manifest.content_scripts?.[0]?.js ?? [];
    if (files.length === 0) return false;

    await ext.scripting.executeScript({
      target: { tabId },
      files,
    });
    await new Promise<void>((r) => setTimeout(r, 150));
    return true;
  } catch (e) {
    console.warn("[ClipJect] Content script injection failed:", e);
    return false;
  }
}

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
