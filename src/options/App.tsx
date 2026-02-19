import { useCallback, useEffect, useState } from "react";
import { useOptionsStore } from "./stores/options-store";
import { GlobalSnippetsPage } from "./global-snippets";
import { PerInputSnippetsPage } from "./per-input-snippets";
import { SettingsPage } from "./settings";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useThemeInit } from "@/components/theme-switcher/hooks/use-theme-init";

type Tab = "global" | "per-input" | "settings";

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: "global", label: "Global Snippets" },
  { id: "per-input", label: "Per-Input Snippets" },
  { id: "settings", label: "Settings" },
];

export function OptionsApp() {
  useThemeInit();

  const [tab, setTab] = useState<Tab>("global");
  const loadAll = useOptionsStore((s) => s.loadAll);
  const loaded = useOptionsStore((s) => s.loaded);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const renderContent = useCallback(() => {
    switch (tab) {
      case "global":
        return <GlobalSnippetsPage />;
      case "per-input":
        return <PerInputSnippetsPage />;
      case "settings":
        return <SettingsPage />;
    }
  }, [tab]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">ClipJect Options</h1>
          <p className="text-sm text-muted-foreground">
            Manage your saved snippets and extension settings.
          </p>
        </div>

        <Separator />

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="flex w-48 shrink-0 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant={tab === item.id ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">{renderContent()}</main>
        </div>
      </div>
    </div>
  );
}
