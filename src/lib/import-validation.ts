/**
 * Pure validation for ClipJect export payloads.
 *
 * Validates the shape of parsed JSON before it touches storage.
 * No side-effects, no imports from chrome APIs — safe to unit-test.
 */

import type { ClipjectExportPayload } from "@/types/storage";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { ok: true; payload: ClipjectExportPayload }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

/**
 * Validate a single Snippet-shaped object.
 * Returns an error string or null if valid.
 */
function validateSnippet(s: unknown, ctx: string): string | null {
  if (!isRecord(s)) return `${ctx}: not an object`;
  if (!isString(s.id)) return `${ctx}: missing or invalid "id"`;
  if (!isString(s.value)) return `${ctx}: missing or invalid "value"`;
  if (!isNumber(s.createdAt)) return `${ctx}: missing or invalid "createdAt"`;
  if (!isNumber(s.updatedAt)) return `${ctx}: missing or invalid "updatedAt"`;
  // label is optional
  if (s.label !== undefined && !isString(s.label)) {
    return `${ctx}: "label" must be a string if present`;
  }
  return null;
}

function validatePageMeta(p: unknown, ctx: string): string | null {
  if (!isRecord(p)) return `${ctx}: not an object`;
  if (!isString(p.origin)) return `${ctx}: missing "origin"`;
  if (!isString(p.pathname)) return `${ctx}: missing "pathname"`;
  if (!isString(p.titleLastSeen)) return `${ctx}: missing "titleLastSeen"`;
  return null;
}

function validateInputMeta(m: unknown, ctx: string): string | null {
  if (!isRecord(m)) return `${ctx}: not an object`;
  if (!isString(m.signature)) return `${ctx}: missing "signature"`;
  if (m.tag !== "input" && m.tag !== "textarea") {
    return `${ctx}: "tag" must be "input" or "textarea"`;
  }
  if (!isNumber(m.lastSeenAt)) return `${ctx}: missing "lastSeenAt"`;
  if (m.type !== undefined && !isString(m.type)) {
    return `${ctx}: "type" must be a string if present`;
  }
  return null;
}

function validateInputEntry(e: unknown, key: string): string | null {
  const ctx = `perInputDb["${key}"]`;
  if (!isRecord(e)) return `${ctx}: not an object`;

  const pageErr = validatePageMeta(e.page, `${ctx}.page`);
  if (pageErr) return pageErr;

  const inputErr = validateInputMeta(e.input, `${ctx}.input`);
  if (inputErr) return inputErr;

  if (!Array.isArray(e.snippets)) return `${ctx}: "snippets" is not an array`;
  for (let i = 0; i < e.snippets.length; i++) {
    const snippetErr = validateSnippet(
      e.snippets[i],
      `${ctx}.snippets[${i}]`,
    );
    if (snippetErr) return snippetErr;
  }

  return null;
}

function validateTrackedInput(t: unknown, idx: number): string | null {
  const ctx = `trackedInputs[${idx}]`;
  if (!isRecord(t)) return `${ctx}: not an object`;
  if (!isString(t.origin)) return `${ctx}: missing "origin"`;
  if (!isString(t.pathname)) return `${ctx}: missing "pathname"`;
  if (!isString(t.inputSignature)) return `${ctx}: missing "inputSignature"`;
  if (!isNumber(t.registeredAt)) return `${ctx}: missing "registeredAt"`;
  return null;
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

/**
 * Validate that an unknown value conforms to `ClipjectExportPayload`.
 *
 * Call this on the result of `JSON.parse()` before importing.
 */
export function validateExportPayload(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "Payload is not a JSON object." };
  }

  if (raw.source !== "clipject") {
    return { ok: false, error: 'Missing or invalid "source" field.' };
  }

  if (raw.version !== 1) {
    return {
      ok: false,
      error: `Unsupported version "${String(raw.version)}". Expected 1.`,
    };
  }

  if (!isNumber(raw.exportedAt)) {
    return { ok: false, error: 'Missing or invalid "exportedAt" timestamp.' };
  }

  const data = raw.data;
  if (!isRecord(data)) {
    return { ok: false, error: '"data" field is missing or not an object.' };
  }

  // --- globalSnippets ---
  if (!Array.isArray(data.globalSnippets)) {
    return { ok: false, error: '"data.globalSnippets" is not an array.' };
  }
  for (let i = 0; i < data.globalSnippets.length; i++) {
    const err = validateSnippet(
      data.globalSnippets[i],
      `globalSnippets[${i}]`,
    );
    if (err) return { ok: false, error: err };
  }

  // --- perInputDb ---
  if (!isRecord(data.perInputDb)) {
    return { ok: false, error: '"data.perInputDb" is not an object.' };
  }
  for (const [key, entry] of Object.entries(data.perInputDb)) {
    const err = validateInputEntry(entry, key);
    if (err) return { ok: false, error: err };
  }

  // --- trackedInputs ---
  if (!Array.isArray(data.trackedInputs)) {
    return { ok: false, error: '"data.trackedInputs" is not an array.' };
  }
  for (let i = 0; i < data.trackedInputs.length; i++) {
    const err = validateTrackedInput(data.trackedInputs[i], i);
    if (err) return { ok: false, error: err };
  }

  const payload: ClipjectExportPayload = {
    source: "clipject",
    version: 1,
    exportedAt: raw.exportedAt,
    data: {
      globalSnippets:
        data.globalSnippets as ClipjectExportPayload["data"]["globalSnippets"],
      perInputDb:
        data.perInputDb as ClipjectExportPayload["data"]["perInputDb"],
      trackedInputs:
        data.trackedInputs as ClipjectExportPayload["data"]["trackedInputs"],
    },
  };

  return { ok: true, payload };
}
