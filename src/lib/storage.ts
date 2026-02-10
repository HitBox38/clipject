/**
 * Typed helpers for reading and writing ClipJect data
 * in chrome.storage.local.
 *
 * Every public function here is async and uses the ext wrapper so the
 * same code works on Chrome and (eventually) Firefox.
 */

import type {
  GlobalSnippet,
  InputEntry,
  InputMeta,
  PageMeta,
  PerInputDb,
  Snippet,
  Theme,
} from "@/types/storage";
import { ext } from "./ext";
import {
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_GLOBAL_SNIPPETS,
  STORAGE_KEY_PER_INPUT_DB,
  STORAGE_KEY_THEME,
} from "./constants";

// ---------------------------------------------------------------------------
// Generic low-level helpers
// ---------------------------------------------------------------------------

async function getKey<T>(key: string, fallback: T): Promise<T> {
  const result = await ext.storage.local.get(key);
  return (result[key] as T) ?? fallback;
}

async function setKey<T>(key: string, value: T): Promise<void> {
  await ext.storage.local.set({ [key]: value });
}

// ---------------------------------------------------------------------------
// Per-input database
// ---------------------------------------------------------------------------

export async function getPerInputDb(): Promise<PerInputDb> {
  return getKey<PerInputDb>(STORAGE_KEY_PER_INPUT_DB, {});
}

export async function getInputEntry(
  compositeKey: string,
): Promise<InputEntry | null> {
  const db = await getPerInputDb();
  return db[compositeKey] ?? null;
}

export async function saveInputSnippet(
  compositeKey: string,
  page: PageMeta,
  input: InputMeta,
  snippet: Snippet,
): Promise<void> {
  const db = await getPerInputDb();

  const existing = db[compositeKey];
  if (existing) {
    existing.page.titleLastSeen = page.titleLastSeen;
    existing.input.lastSeenAt = input.lastSeenAt;
    existing.snippets.push(snippet);
  } else {
    db[compositeKey] = { page, input, snippets: [snippet] };
  }

  await setKey(STORAGE_KEY_PER_INPUT_DB, db);
}

export async function deleteInputSnippet(
  compositeKey: string,
  snippetId: string,
): Promise<void> {
  const db = await getPerInputDb();
  const entry = db[compositeKey];
  if (!entry) return;

  entry.snippets = entry.snippets.filter((s) => s.id !== snippetId);

  // If no snippets remain, remove the entire entry.
  if (entry.snippets.length === 0) {
    delete db[compositeKey];
  }

  await setKey(STORAGE_KEY_PER_INPUT_DB, db);
}

export async function updateInputSnippet(
  compositeKey: string,
  snippetId: string,
  patch: Partial<Pick<Snippet, "value" | "label">>,
): Promise<void> {
  const db = await getPerInputDb();
  const entry = db[compositeKey];
  if (!entry) return;

  const snippet = entry.snippets.find((s) => s.id === snippetId);
  if (!snippet) return;

  if (patch.value !== undefined) snippet.value = patch.value;
  if (patch.label !== undefined) snippet.label = patch.label;
  snippet.updatedAt = Date.now();

  await setKey(STORAGE_KEY_PER_INPUT_DB, db);
}

export async function deleteInputEntry(compositeKey: string): Promise<void> {
  const db = await getPerInputDb();
  delete db[compositeKey];
  await setKey(STORAGE_KEY_PER_INPUT_DB, db);
}

// ---------------------------------------------------------------------------
// Global snippets
// ---------------------------------------------------------------------------

export async function getGlobalSnippets(): Promise<GlobalSnippet[]> {
  return getKey<GlobalSnippet[]>(STORAGE_KEY_GLOBAL_SNIPPETS, []);
}

export async function saveGlobalSnippet(
  snippet: GlobalSnippet,
): Promise<void> {
  const list = await getGlobalSnippets();
  list.push(snippet);
  await setKey(STORAGE_KEY_GLOBAL_SNIPPETS, list);
}

export async function deleteGlobalSnippet(snippetId: string): Promise<void> {
  const list = await getGlobalSnippets();
  await setKey(
    STORAGE_KEY_GLOBAL_SNIPPETS,
    list.filter((s) => s.id !== snippetId),
  );
}

export async function updateGlobalSnippet(
  snippetId: string,
  patch: Partial<Pick<Snippet, "value" | "label">>,
): Promise<void> {
  const list = await getGlobalSnippets();
  const snippet = list.find((s) => s.id === snippetId);
  if (!snippet) return;

  if (patch.value !== undefined) snippet.value = patch.value;
  if (patch.label !== undefined) snippet.label = patch.label;
  snippet.updatedAt = Date.now();

  await setKey(STORAGE_KEY_GLOBAL_SNIPPETS, list);
}

// ---------------------------------------------------------------------------
// Enabled flag
// ---------------------------------------------------------------------------

export async function getEnabled(): Promise<boolean> {
  return getKey<boolean>(STORAGE_KEY_ENABLED, true);
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await setKey(STORAGE_KEY_ENABLED, enabled);
}

// ---------------------------------------------------------------------------
// Theme preference
// ---------------------------------------------------------------------------

export async function getTheme(): Promise<Theme> {
  return getKey<Theme>(STORAGE_KEY_THEME, "system");
}

export async function setTheme(theme: Theme): Promise<void> {
  await setKey(STORAGE_KEY_THEME, theme);
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

export async function clearAllData(): Promise<void> {
  await ext.storage.local.remove([
    STORAGE_KEY_PER_INPUT_DB,
    STORAGE_KEY_GLOBAL_SNIPPETS,
  ]);
}

// ---------------------------------------------------------------------------
// Snippet factory
// ---------------------------------------------------------------------------

export function createSnippet(
  value: string,
  label?: string,
): Snippet {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    value,
    label,
    createdAt: now,
    updatedAt: now,
  };
}
