import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import SunIcon from "@hugeicons/core-free-icons/Sun01Icon";
import MoonIcon from "@hugeicons/core-free-icons/MoonIcon";
import ComputerIcon from "@hugeicons/core-free-icons/ComputerIcon";
import { cn } from "@/lib/utils";
import { useThemeStore } from "./hooks/use-theme-store";
import { THEME_OPTIONS } from "./constants";
import type { Theme } from "@/types/storage";

const ICONS: Record<Theme, typeof SunIcon> = {
  light: SunIcon,
  system: ComputerIcon,
  dark: MoonIcon,
};

export const ThemeSwitcher = () => {
  const [error, setError] = useState("");
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div>
      <div
        role="group"
        aria-label="Theme"
        className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5"
      >
        {THEME_OPTIONS.map((option) => {
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              aria-label={option.label}
              title={option.label}
              className={cn(
                "inline-flex h-9 gap-1.5 px-2 items-center justify-center rounded-md text-xs transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={async () => {
                setError("");
                try {
                  await setTheme(option.value);
                } catch {
                  setError("Couldn’t save appearance. Please try again.");
                }
              }}
            >
              <HugeiconsIcon icon={ICONS[option.value]} className="size-3.5" />
              {option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="inline-error mt-2">
          {error}
        </p>
      )}
    </div>
  );
};
