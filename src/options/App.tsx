import { useEffect, useState } from "react";
import { useOptionsStore } from "./stores/options-store";
import { GlobalSnippetsPage } from "./global-snippets";
import { PerInputSnippetsPage } from "./per-input-snippets";
import { SettingsPage } from "./settings";
import { Button } from "@/components/ui/button";
import { useThemeInit } from "@/components/theme-switcher/hooks/use-theme-init";
import { Brand } from "@/components/brand";

type Tab = "global" | "per-input" | "settings";
const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: "global", label: "Global snippets" },
  { id: "per-input", label: "Field snippets" },
  { id: "settings", label: "Settings" },
];

export function OptionsApp() {
  useThemeInit();
  const [tab, setTab] = useState<Tab>("global");
  const [error, setError] = useState("");
  const loadAll = useOptionsStore((s) => s.loadAll);
  const loaded = useOptionsStore((s) => s.loaded);
  const globalCount = useOptionsStore((s) => s.globalSnippets.length);
  const fieldCount = useOptionsStore((s) =>
    Object.values(s.perInputDb).reduce(
      (sum, entry) => sum + entry.snippets.length,
      0,
    ),
  );
  const load = async () => {
    setError("");
    try {
      await loadAll();
    } catch {
      setError("Your library couldn’t be loaded. Please try again.");
    }
  };
  useEffect(() => {
    void loadAll().catch(() =>
      setError("Your library couldn’t be loaded. Please try again."),
    );
  }, [loadAll]);
  return (
    <div className="options-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Brand />
          <span className="app-context">Snippet library</span>
          <span className="local-note">Stored on this device</span>
        </div>
        <nav aria-label="Library navigation" className="library-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-item"
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <span>{item.label}</span>
              {item.id !== "settings" && loaded && (
                <span className="nav-count">
                  {item.id === "global" ? globalCount : fieldCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>
      <div className="library-layout">
        <main id="main-content" tabIndex={-1} className="library-main">
          {error ? (
            <div className="empty-state" role="alert">
              <h1>Library unavailable</h1>
              <p>{error}</p>
              <Button onClick={() => void load()}>Retry</Button>
            </div>
          ) : !loaded ? (
            <div
              className="loading-state"
              role="status"
              aria-label="Loading your library"
            >
              <div />
              <div />
              <div />
              <span className="sr-only">Loading your library…</span>
            </div>
          ) : tab === "global" ? (
            <GlobalSnippetsPage />
          ) : tab === "per-input" ? (
            <PerInputSnippetsPage />
          ) : (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}
