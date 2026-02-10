import type { InputMeta, PageMeta } from "@/types/storage";
import { KEY_PAGE_TITLE_SEP } from "./constants";

// ---------------------------------------------------------------------------
// Page key
// ---------------------------------------------------------------------------

export interface PageKeyResult {
  key: string;
  meta: PageMeta;
}

/**
 * Compute a unique page key from origin + pathname + title.
 * Format: `${origin}${pathname}::${title}`
 */
export function computePageKey(): PageKeyResult {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const title = document.title;

  return {
    key: `${origin}${pathname}${KEY_PAGE_TITLE_SEP}${title}`,
    meta: { origin, pathname, titleLastSeen: title },
  };
}

// ---------------------------------------------------------------------------
// Input signature
// ---------------------------------------------------------------------------

type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Build a CSS-selector-like DOM path for an element.
 * Uses `nth-of-type` when siblings share the same tag.
 */
function getDomPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;

    if (parent) {
      const currentTag = current.tagName;
      const siblings = Array.from(parent.children).filter(
        (c: Element) => c.tagName === currentTag,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        parts.unshift(`${tag}:nth-of-type(${index})`);
      } else {
        parts.unshift(tag);
      }
    } else {
      parts.unshift(tag);
    }

    current = parent;
  }

  return parts.join(" > ");
}

/**
 * Compute a stable identity string for an input element.
 *
 * Priority (first non-empty wins):
 *  1. `id`
 *  2. `name`
 *  3. `aria-label`
 *  4. `placeholder`
 *  5. DOM path fallback
 *
 * The result is prefixed with the strategy so callers can reason about stability.
 */
export function computeInputSignature(el: SupportedElement): string {
  if (el.id) return `id:${el.id}`;
  if (el.name) return `name:${el.name}`;

  const aria = el.getAttribute("aria-label");
  if (aria) return `aria:${aria}`;

  if (el.placeholder) return `ph:${el.placeholder}`;

  return `path:${getDomPath(el)}`;
}

/**
 * Build the full composite storage key for a specific input on a specific page.
 */
export function buildCompositeKey(
  pageKey: string,
  inputSignature: string,
): string {
  return `${pageKey}${KEY_PAGE_TITLE_SEP}${inputSignature}`;
}

/**
 * Build InputMeta from an element.
 */
export function buildInputMeta(el: SupportedElement): InputMeta {
  const tag = el.tagName.toLowerCase() as "input" | "textarea";
  const meta: InputMeta = {
    signature: computeInputSignature(el),
    tag,
    lastSeenAt: Date.now(),
  };

  if (tag === "input") {
    meta.type = (el as HTMLInputElement).type || "text";
  }

  return meta;
}

/**
 * Returns `true` when the element is a password field we should skip.
 */
export function isPasswordField(el: Element): boolean {
  return (
    el instanceof HTMLInputElement &&
    el.type === "password"
  );
}

/**
 * Returns `true` when the element is a supported input or textarea.
 */
export function isSupportedField(el: Element): el is SupportedElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const unsupported = new Set([
      "password",
      "hidden",
      "file",
      "image",
      "submit",
      "reset",
      "button",
      "checkbox",
      "radio",
      "range",
      "color",
    ]);
    return !unsupported.has(el.type);
  }
  return false;
}
