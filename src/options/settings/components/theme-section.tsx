import { ThemeSwitcher } from "@/components/theme-switcher";

export function ThemeSection() {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Appearance</p>
        <p className="text-xs text-muted-foreground">
          Choose between light, dark, or system theme.
        </p>
      </div>
      <ThemeSwitcher />
    </div>
  );
}
