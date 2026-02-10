/** chrome.storage.local key for the per-input snippet database. */
export const STORAGE_KEY_PER_INPUT_DB = "clipject:perInputDb:v1" as const;

/** chrome.storage.local key for global snippets. */
export const STORAGE_KEY_GLOBAL_SNIPPETS =
  "clipject:globalSnippets:v1" as const;

/** chrome.storage.local key for the extension enabled/disabled flag. */
export const STORAGE_KEY_ENABLED = "clipject:enabled:v1" as const;

/** chrome.storage.local key for the theme preference. */
export const STORAGE_KEY_THEME = "clipject:theme:v1" as const;

/** Current schema version — bump when the storage shape changes. */
export const SCHEMA_VERSION = 1;

/** Separator between page-level key parts and the input signature. */
export const KEY_PAGE_TITLE_SEP = "::" as const;

/** Maximum z-index for the picker overlay. */
export const PICKER_Z_INDEX = 2147483647;

/** Debounce delay (ms) before showing the picker after focus. */
export const FOCUS_DEBOUNCE_MS = 150;
