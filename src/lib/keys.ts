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
export const computePageKey = (): PageKeyResult => {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const title = document.title;

  return {
    key: `${origin}${pathname}${KEY_PAGE_TITLE_SEP}${title}`,
    meta: { origin, pathname, titleLastSeen: title },
  };
};

// ---------------------------------------------------------------------------
// Input signature
// ---------------------------------------------------------------------------

type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Build a CSS-selector-like DOM path for an element.
 * Uses `nth-of-type` when siblings share the same tag.
 */
const getDomPath = (el: Element): string => {
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
};

/**
 * Prefer the first stable attribute that uniquely identifies this field among
 * the page's inputs and textareas. A shared name (or invalid duplicate ID) is
 * not an identity: continue to the next attribute, then the DOM path.
 *
 * Unique attributes retain their existing storage keys. Ambiguous legacy keys
 * are deliberately not reused or migrated to an arbitrary matching field;
 * they remain in the library, unmatched while duplicates exist. If the page
 * changes which attributes are unique, its field identities can change too.
 */
export const computeInputSignature = (el: SupportedElement): string => {
  const fields = Array.from(document.querySelectorAll("input, textarea"));
  const attributes = [
    ["id", "id"],
    ["name", "name"],
    ["aria-label", "aria"],
    ["placeholder", "ph"],
  ] as const;

  for (const [attribute, prefix] of attributes) {
    const value = el.getAttribute(attribute);
    if (
      value &&
      !fields.some(
        (other) => other !== el && other.getAttribute(attribute) === value,
      )
    ) {
      return `${prefix}:${value}`;
    }
  }

  return `path:${getDomPath(el)}`;
};

/**
 * Build the full composite storage key for a specific input on a specific page.
 */
export const buildCompositeKey = (
  pageKey: string,
  inputSignature: string,
): string => {
  return `${pageKey}${KEY_PAGE_TITLE_SEP}${inputSignature}`;
};

/**
 * Build a tracking fingerprint for an input on a page.
 *
 * Unlike the composite key, this omits the page title so the fingerprint
 * remains stable even when the SPA title changes.
 *
 * Format: `${origin}${pathname}::${inputSignature}`
 */
export const buildTrackingFingerprint = (
  origin: string,
  pathname: string,
  inputSignature: string,
): string => {
  return `${origin}${pathname}${KEY_PAGE_TITLE_SEP}${inputSignature}`;
};

/**
 * Build InputMeta from an element.
 */
export const buildInputMeta = (el: SupportedElement): InputMeta => {
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
};

/**
 * Returns `true` when the element is a password field we should skip.
 */
export const isPasswordField = (el: Element): boolean => {
  return el instanceof HTMLInputElement && el.type === "password";
};

/**
 * Returns `true` when the element is a supported, editable input or textarea.
 */
export const isSupportedField = (el: Element): el is SupportedElement => {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return false;
  }

  // :disabled includes inherited fieldset state and its first-legend exception.
  if (el.readOnly || el.matches(":disabled") || el.closest("[inert]")) {
    return false;
  }

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
};
