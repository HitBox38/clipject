import type { Theme } from "@/types/storage";

export const THEME_OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
] as const;

export const PREFERS_DARK_MQ = "(prefers-color-scheme: dark)" as const;
