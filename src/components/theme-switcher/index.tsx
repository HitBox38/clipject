import { HugeiconsIcon } from "@hugeicons/react";
import {
  SunIcon,
  MoonIcon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";
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
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5"
    >
      {THEME_OPTIONS.map((option) => {
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            type="button"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => void setTheme(option.value)}
          >
            <HugeiconsIcon
              icon={ICONS[option.value]}
              className="size-3.5"
            />
          </button>
        );
      })}
    </div>
  );
}

