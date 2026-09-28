import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllGlobals();
});
