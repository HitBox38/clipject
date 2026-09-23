import { useCallback, useEffect, useState } from "react";
import { ext } from "@/lib/ext";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import type { StartElementSelectionMessage } from "@/types/messages";
import { useThemeInit } from "@/components/theme-switcher/hooks/use-theme-init";
import { usePopupStore } from "./stores/popup-store";

export function PopupApp() {
  useThemeInit();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loaded = usePopupStore((s) => s.loaded);
  const enabled = usePopupStore((s) => s.enabled);
  const globalCount = usePopupStore((s) => s.globalCount);
  const inputCount = usePopupStore((s) => s.inputCount);
  const trackedCount = usePopupStore((s) => s.trackedCount);
  const loadStats = usePopupStore((s) => s.loadStats);
  const toggleEnabled = usePopupStore((s) => s.toggleEnabled);

  useEffect(() => {
    void loadStats().catch(() =>
      setError("Couldn’t load your library. Reopen ClipJect to try again."),
    );
  }, [loadStats]);

  const handleToggle = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await toggleEnabled();
    } catch {
      setError("Couldn’t update ClipJect. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [toggleEnabled]);

  const handleSelectElement = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [tab] = await ext.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab");

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

      setError(
        "This page doesn’t allow ClipJect. Try a regular webpage, then select a field.",
      );
    } catch {
      setError("Couldn’t select a field on this page. Try another webpage.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleOpenOptions = useCallback(() => {
    void ext.runtime
      .openOptionsPage()
      .catch(() => setError("Couldn’t open your library. Please try again."));
  }, []);

  if (!loaded) {
    return (
      <div className="popup-shell" role="status">
        <Brand />
        <p className="popup-help">{error || "Loading your library…"}</p>
      </div>
    );
  }
  return (
    <main className="popup-shell">
      <header className="popup-heading">
        <Brand />
      </header>
      <div className="popup-status">
        <div>
          <strong>{enabled ? "ClipJect is on" : "ClipJect is paused"}</strong>
          <p>
            {enabled
              ? "Active in your selected fields."
              : "Turn on to use snippets on webpages."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Enable ClipJect"
          aria-checked={enabled}
          className="popup-switch"
          disabled={busy}
          onClick={() => void handleToggle()}
        >
          <span />
        </button>
      </div>
      <dl className="popup-stats">
        <div>
          <dd>{globalCount}</dd>
          <dt>Global snippets</dt>
        </div>
        <div>
          <dd>{inputCount}</dd>
          <dt>Field snippets</dt>
        </div>
        <div>
          <dd>{trackedCount}</dd>
          <dt>Selected fields</dt>
        </div>
      </dl>
      <div className="flex flex-col gap-2.5">
        <Button
          size="lg"
          className="w-full h-9"
          disabled={!enabled || busy}
          onClick={() => void handleSelectElement()}
        >
          <CrosshairIcon />
          {busy ? "Working…" : "Select a field"}
        </Button>
        <p className="popup-help">
          Click a text field on this page to enable its snippet picker.
        </p>
      </div>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        className="w-full h-10"
        onClick={handleOpenOptions}
      >
        Open snippet library <span aria-hidden="true">↗</span>
      </Button>
      <p className="local-note justify-center">Stored on this device</p>
    </main>
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
