type ExtBrowser = typeof chrome;
type ExtensionGlobals = typeof globalThis & {
  browser?: ExtBrowser;
  chrome?: ExtBrowser;
};

const globals = globalThis as ExtensionGlobals;

export const ext: ExtBrowser = globals.browser ?? globals.chrome;
