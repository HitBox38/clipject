/**
 * Encode / decode share strings for individual per-input snippets.
 *
 * Format:  clipject:share:v1:<base64url-encoded-json>
 *
 * The JSON payload carries the full context (page, input, snippet) so the
 * receiver can import it into the correct per-input bucket without any
 * additional information.
 */

import type {
  InputMeta,
  PageMeta,
  SharedSnippetPayload,
  Snippet,
} from "@/types/storage";
import { saveInputSnippet, createSnippet } from "./storage";
import { KEY_PAGE_TITLE_SEP } from "./constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHARE_PREFIX = "clipject:share:v1:";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type DecodeResult =
  | { ok: true; payload: SharedSnippetPayload }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Standard base64 -> base64url (URL-safe, no padding).
 */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * base64url -> standard base64.
 */
function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // Re-add padding
  const padLen = (4 - (b64.length % 4)) % 4;
  b64 += "=".repeat(padLen);
  return b64;
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/**
 * Build a copy-pasteable share string for a single per-input snippet.
 */
export function encodeShareString(payload: SharedSnippetPayload): string {
  const json = JSON.stringify(payload);
  const base64 = btoa(
    // Handle multi-byte characters (emoji, CJK, etc.)
    new TextEncoder()
      .encode(json)
      .reduce((acc, byte) => acc + String.fromCharCode(byte), ""),
  );
  return `${SHARE_PREFIX}${toBase64Url(base64)}`;
}

// ---------------------------------------------------------------------------
// Decode + validate
// ---------------------------------------------------------------------------

function validateSharedPayload(raw: unknown): string | null {
  if (!isRecord(raw)) return "Not a JSON object.";
  if (raw.type !== "per-input-snippet") return 'Invalid payload type.';

  // page
  if (!isRecord(raw.page)) return "Missing page metadata.";
  if (!isString(raw.page.origin)) return 'Missing page "origin".';
  if (!isString(raw.page.pathname)) return 'Missing page "pathname".';
  if (!isString(raw.page.titleLastSeen)) return 'Missing page "titleLastSeen".';

  // input
  if (!isRecord(raw.input)) return "Missing input metadata.";
  if (!isString(raw.input.signature)) return 'Missing input "signature".';
  if (raw.input.tag !== "input" && raw.input.tag !== "textarea") {
    return 'Input "tag" must be "input" or "textarea".';
  }
  if (!isNumber(raw.input.lastSeenAt)) return 'Missing input "lastSeenAt".';

  // snippet
  if (!isRecord(raw.snippet)) return "Missing snippet data.";
  if (!isString(raw.snippet.id)) return 'Missing snippet "id".';
  if (!isString(raw.snippet.value)) return 'Missing snippet "value".';
  if (!isNumber(raw.snippet.createdAt)) return 'Missing snippet "createdAt".';
  if (!isNumber(raw.snippet.updatedAt)) return 'Missing snippet "updatedAt".';

  return null;
}

/**
 * Decode and validate a share string.
 */
export function decodeShareString(str: string): DecodeResult {
  const trimmed = str.trim();

  if (!trimmed.startsWith(SHARE_PREFIX)) {
    return { ok: false, error: "Not a valid ClipJect share string." };
  }

  const encoded = trimmed.slice(SHARE_PREFIX.length);
  if (encoded.length === 0) {
    return { ok: false, error: "Share string is empty." };
  }

  let json: string;
  try {
    const binaryStr = atob(fromBase64Url(encoded));
    const bytes = Uint8Array.from(binaryStr, (ch) => ch.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    return { ok: false, error: "Failed to decode base64 content." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Share string contains invalid JSON." };
  }

  const err = validateSharedPayload(parsed);
  if (err) return { ok: false, error: err };

  return { ok: true, payload: parsed as SharedSnippetPayload };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Import a decoded shared snippet into storage.
 *
 * Generates a fresh snippet ID so there are no collisions if the same
 * share string is imported multiple times.
 */
export async function importSharedSnippet(
  payload: SharedSnippetPayload,
): Promise<void> {
  const { page, input, snippet } = payload;

  // Build the composite key the same way the content script does:
  // `${origin}${pathname}::${title}::${inputSignature}`
  const pageKey = `${page.origin}${page.pathname}${KEY_PAGE_TITLE_SEP}${page.titleLastSeen}`;
  const compositeKey = `${pageKey}${KEY_PAGE_TITLE_SEP}${input.signature}`;

  const fresh: Snippet = createSnippet(snippet.value, snippet.label);

  const pageMeta: PageMeta = { ...page };
  const inputMeta: InputMeta = { ...input, lastSeenAt: Date.now() };

  await saveInputSnippet(compositeKey, pageMeta, inputMeta, fresh);
}
