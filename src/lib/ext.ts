/**
 * Browser API wrapper for cross-browser compatibility.
 * Chrome uses `chrome.*`, Firefox uses `browser.*` (promise-based).
 * This wrapper normalises the difference so all call-sites use `ext.*`.
 */

type ExtBrowser = typeof chrome;

export const ext: ExtBrowser =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).browser ?? (globalThis as any).chrome;
