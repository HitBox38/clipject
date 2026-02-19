/**
 * Typed helpers for reading and writing ClipJect data
 * in chrome.storage.local.
 *
 * Every public function here is async and uses the ext wrapper so the
 * same code works on Chrome and (eventually) Firefox.
 */

import type {
  ClipjectExportPayload,
  GlobalSnippet,
  ImportResult,
  InputEntry,
  InputMeta,
  PageMeta,
  PerInputDb,
  Snippet,
  Theme,
  TrackedInput,
} from "@/types/storage";
import { ext } from "./ext";
import {
  KEY_PAGE_TITLE_SEP,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_GLOBAL_SNIPPETS,
  STORAGE_KEY_PER_INPUT_DB,
  STORAGE_KEY_THEME,
  STORAGE_KEY_TRACKED_INPUTS,
} from "./constants";
import { buildTrackingFingerprint } from "./keys";

// ---------------------------------------------------------------------------
// Generic low-level helpers
// ---------------------------------------------------------------------------

const getKey = async <T>(key: string, fallback: T): Promise<T> => {
  const result = await ext.storage.local.get(key);
  return (result[key] as T) ?? fallback;
}

const setKey = async <T>(key: string, value: T): Promise<void> => {
  await ext.storage.local.set({ [key]: value });
}

// ---------------------------------------------------------------------------
// Per-input database
// ---------------------------------------------------------------------------

export const getPerInputDb = async (): Promise<PerInputDb> => {
  return getKey<PerInputDb>(STORAGE_KEY_PER_INPUT_DB, {});
}

export const getInputEntry = async (
  compositeKey: string,
): Promise<InputEntry | null> => {
  const db = await getPerInputDb();
  return db[compositeKey] ?? null;
}

export const saveInputSnippet = async (
  compositeKey: string,
  page: PageMeta,
  input: InputMeta,
  snippet: Snippet,
): Promise<void> => {
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

export const deleteInputSnippet = async (
  compositeKey: string,
  snippetId: string,
): Promise<void> => {
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

export const updateInputSnippet = async (
  compositeKey: string,
  snippetId: string,
  patch: Partial<Pick<Snippet, "value" | "label">>,
): Promise<void> => {
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

export const deleteInputEntry = async (compositeKey: string): Promise<void> => {
  const db = await getPerInputDb();
  delete db[compositeKey];
  await setKey(STORAGE_KEY_PER_INPUT_DB, db);
}

// ---------------------------------------------------------------------------
// Global snippets
// ---------------------------------------------------------------------------

export const getGlobalSnippets = async (): Promise<GlobalSnippet[]> => {
  return getKey<GlobalSnippet[]>(STORAGE_KEY_GLOBAL_SNIPPETS, []);
}

export const saveGlobalSnippet = async (
  snippet: GlobalSnippet,
): Promise<void> => {
  const list = await getGlobalSnippets();
  list.push(snippet);
  await setKey(STORAGE_KEY_GLOBAL_SNIPPETS, list);
}

export const deleteGlobalSnippet = async (snippetId: string): Promise<void> => {
  const list = await getGlobalSnippets();
  await setKey(
    STORAGE_KEY_GLOBAL_SNIPPETS,
    list.filter((s) => s.id !== snippetId),
  );
}

export const updateGlobalSnippet = async (
  snippetId: string,
  patch: Partial<Pick<Snippet, "value" | "label">>,
): Promise<void> => {
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

export const getEnabled = async (): Promise<boolean> => {
  return getKey<boolean>(STORAGE_KEY_ENABLED, true);
}

export const setEnabled = async (enabled: boolean): Promise<void> => {
  await setKey(STORAGE_KEY_ENABLED, enabled);
}

// ---------------------------------------------------------------------------
// Theme preference
// ---------------------------------------------------------------------------

export const getTheme = async (): Promise<Theme> => {
  return getKey<Theme>(STORAGE_KEY_THEME, "system");
}

export const setTheme = async (theme: Theme): Promise<void> => {
  await setKey(STORAGE_KEY_THEME, theme);
}

// ---------------------------------------------------------------------------
// Tracked inputs
// ---------------------------------------------------------------------------

export const getTrackedInputs = async (): Promise<TrackedInput[]> => {
  return getKey<TrackedInput[]>(STORAGE_KEY_TRACKED_INPUTS, []);
}

export const addTrackedInput = async (
  input: TrackedInput,
): Promise<void> => {
  const list = await getTrackedInputs();
  const fingerprint = buildTrackingFingerprint(
    input.origin,
    input.pathname,
    input.inputSignature,
  );

  // Avoid duplicates.
  const exists = list.some(
    (t) =>
      buildTrackingFingerprint(t.origin, t.pathname, t.inputSignature) ===
      fingerprint,
  );
  if (exists) return;

  list.push(input);
  await setKey(STORAGE_KEY_TRACKED_INPUTS, list);
}

export const removeTrackedInput = async (
  fingerprint: string,
): Promise<void> => {
  const list = await getTrackedInputs();
  await setKey(
    STORAGE_KEY_TRACKED_INPUTS,
    list.filter(
      (t) =>
        buildTrackingFingerprint(t.origin, t.pathname, t.inputSignature) !==
        fingerprint,
    ),
  );
}

/**
 * Build a set of all tracked fingerprints by merging:
 *  1. Explicitly tracked inputs
 *  2. Inputs that already have snippets in the per-input DB
 *
 * This ensures backward compat — any input with saved snippets
 * is automatically treated as tracked.
 */
export const buildTrackedFingerprintSet = async (): Promise<Set<string>> => {
  const [tracked, db] = await Promise.all([
    getTrackedInputs(),
    getPerInputDb(),
  ]);

  const set = new Set<string>();

  for (const t of tracked) {
    set.add(
      buildTrackingFingerprint(t.origin, t.pathname, t.inputSignature),
    );
  }

  for (const entry of Object.values(db)) {
    set.add(
      buildTrackingFingerprint(
        entry.page.origin,
        entry.page.pathname,
        entry.input.signature,
      ),
    );
  }

  return set;
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

export const clearAllData = async (): Promise<void> => {
  await ext.storage.local.remove([
    STORAGE_KEY_PER_INPUT_DB,
    STORAGE_KEY_GLOBAL_SNIPPETS,
    STORAGE_KEY_TRACKED_INPUTS,
  ]);
}

// ---------------------------------------------------------------------------
// Full export
// ---------------------------------------------------------------------------

/**
 * Read all user data and wrap it in a versioned export envelope.
 */
export const exportAllData = async (): Promise<ClipjectExportPayload> => {
  const [globalSnippets, perInputDb, trackedInputs] = await Promise.all([
    getGlobalSnippets(),
    getPerInputDb(),
    getTrackedInputs(),
  ]);

  return {
    source: "clipject",
    version: 1,
    exportedAt: Date.now(),
    data: { globalSnippets, perInputDb, trackedInputs },
  };
}

// ---------------------------------------------------------------------------
// Full import
// ---------------------------------------------------------------------------

/**
 * Import a validated export payload into storage.
 *
 * @param payload  Must already be validated via `validateExportPayload`.
 * @param strategy "replace" wipes existing data first;
 *                 "merge" adds incoming data on top of what already exists.
 * @returns Counts of what was imported so the UI can show a summary.
 */
export const importAllData = async (
  payload: ClipjectExportPayload,
  strategy: "merge" | "replace",
): Promise<ImportResult> => {
  const { globalSnippets, perInputDb, trackedInputs } = payload.data;

  if (strategy === "replace") {
    await clearAllData();
    await setKey(STORAGE_KEY_GLOBAL_SNIPPETS, globalSnippets);
    await setKey(STORAGE_KEY_PER_INPUT_DB, perInputDb);
    await setKey(STORAGE_KEY_TRACKED_INPUTS, trackedInputs);
  } else {
    // --- merge global snippets (skip duplicates by id) ---
    const existingGlobal = await getGlobalSnippets();
    const existingGlobalIds = new Set(existingGlobal.map((s) => s.id));
    for (const s of globalSnippets) {
      if (!existingGlobalIds.has(s.id)) {
        existingGlobal.push(s);
      }
    }
    await setKey(STORAGE_KEY_GLOBAL_SNIPPETS, existingGlobal);

    // --- merge per-input DB (merge snippets within entries) ---
    const existingDb = await getPerInputDb();
    for (const [key, entry] of Object.entries(perInputDb)) {
      const existing = existingDb[key];
      if (existing) {
        const existingIds = new Set(existing.snippets.map((s) => s.id));
        for (const s of entry.snippets) {
          if (!existingIds.has(s.id)) {
            existing.snippets.push(s);
          }
        }
        // Update page title if the import is newer.
        if (entry.input.lastSeenAt > existing.input.lastSeenAt) {
          existing.page.titleLastSeen = entry.page.titleLastSeen;
          existing.input.lastSeenAt = entry.input.lastSeenAt;
        }
      } else {
        existingDb[key] = entry;
      }
    }
    await setKey(STORAGE_KEY_PER_INPUT_DB, existingDb);

    // --- merge tracked inputs (skip duplicates by fingerprint) ---
    const existingTracked = await getTrackedInputs();
    const existingFingerprints = new Set(
      existingTracked.map((t) =>
        buildTrackingFingerprint(t.origin, t.pathname, t.inputSignature),
      ),
    );
    for (const t of trackedInputs) {
      const fp = buildTrackingFingerprint(
        t.origin,
        t.pathname,
        t.inputSignature,
      );
      if (!existingFingerprints.has(fp)) {
        existingTracked.push(t);
        existingFingerprints.add(fp);
      }
    }
    await setKey(STORAGE_KEY_TRACKED_INPUTS, existingTracked);
  }

  return {
    globalSnippets: globalSnippets.length,
    perInputEntries: Object.keys(perInputDb).length,
    trackedInputs: trackedInputs.length,
  };
}

// ---------------------------------------------------------------------------
// Clone per-input entry to another domain
// ---------------------------------------------------------------------------

/**
 * Deep-clone a per-input entry to a new target origin/pathname.
 *
 * All snippets receive fresh IDs so the clone is fully independent of
 * the source. A tracked input is also created for the new target.
 *
 * @returns The number of snippets cloned.
 */
export const cloneInputEntry = async (
  sourceKey: string,
  targetOrigin: string,
  targetPathname: string,
  targetInputSignature?: string,
): Promise<number> => {
  const db = await getPerInputDb();
  const source = db[sourceKey];
  if (!source) {
    throw new Error(`Source entry "${sourceKey}" not found.`);
  }

  const inputSig = targetInputSignature ?? source.input.signature;
  const now = Date.now();

  // Build the new composite key: origin + pathname :: title :: inputSignature
  // We reuse the source's last-seen title since the user hasn't visited the
  // target yet — it will be updated on first visit.
  const pageKey = `${targetOrigin}${targetPathname}${KEY_PAGE_TITLE_SEP}${source.page.titleLastSeen}`;
  const compositeKey = `${pageKey}${KEY_PAGE_TITLE_SEP}${inputSig}`;

  // Deep-clone snippets with fresh IDs.
  const clonedSnippets: Snippet[] = source.snippets.map((s) => ({
    id: crypto.randomUUID(),
    value: s.value,
    label: s.label,
    createdAt: now,
    updatedAt: now,
  }));

  const newEntry: InputEntry = {
    page: {
      origin: targetOrigin,
      pathname: targetPathname,
      titleLastSeen: source.page.titleLastSeen,
    },
    input: {
      signature: inputSig,
      tag: source.input.tag,
      type: source.input.type,
      lastSeenAt: now,
    },
    snippets: clonedSnippets,
  };

  db[compositeKey] = newEntry;
  await setKey(STORAGE_KEY_PER_INPUT_DB, db);

  // Also track the new input.
  await addTrackedInput({
    origin: targetOrigin,
    pathname: targetPathname,
    inputSignature: inputSig,
    registeredAt: now,
  });

  return clonedSnippets.length;
}

// ---------------------------------------------------------------------------
// Snippet factory
// ---------------------------------------------------------------------------

export const createSnippet = (
  value: string,
  label?: string,
): Snippet => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    value,
    label,
    createdAt: now,
    updatedAt: now,
  };
}
