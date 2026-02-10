import { useEffect } from "react";
import { useThemeStore } from "./use-theme-store";

/**
 * Bootstraps the theme store: reads persisted preference, attaches
 * OS media-query and cross-context storage listeners.
 *
 * Call once at the root of each app entry-point (options, popup).
 */
export function useThemeInit(): void {
  useEffect(() => {
    return useThemeStore.getState().init();
  }, []);
}
