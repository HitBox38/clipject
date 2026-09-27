/**
 * Programmatically set a value on an input/textarea and dispatch events
 * so that React, Vue, Angular, and vanilla JS listeners all detect the change.
 */

type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Set `value` on `el` using the native prototype setter (bypasses React's
 * synthetic value property) then dispatches `input` and `change` events.
 * Returns an actionable error without changing the field when text is too long.
 */
export const setNativeValue = (
  el: SupportedElement,
  value: string,
): string | null => {
  const supportsMaxLength =
    el instanceof HTMLTextAreaElement ||
    ["text", "search", "url", "tel", "email", "password"].includes(el.type);
  const limit = el.maxLength;
  if (supportsMaxLength && limit >= 0) {
    // Let the browser normalize newlines and type-specific whitespace on a
    // detached copy. The live field and its events remain untouched on failure.
    const candidate = el.cloneNode(false) as SupportedElement;
    candidate.value = value;
    // Native maxlength uses UTF-16 code units, which String.length also counts.
    if (candidate.value.length > limit) {
      return (
        `This snippet exceeds this field's ${limit}-character limit. ` +
        "Choose a shorter snippet or edit it in the library."
      );
    }
  }

  // 1. Locate the native setter on the prototype chain.
  //    React overwrites `.value` on the instance, so we need the original.
  const descriptor =
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el),
      "value",
    ) ??
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ) ??
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    );

  if (descriptor?.set) {
    descriptor.set.call(el, value);
  } else {
    // Last resort — direct assignment (works for vanilla HTML).
    el.value = value;
  }

  // 2. Dispatch `input` (React / most frameworks listen here).
  el.dispatchEvent(new Event("input", { bubbles: true }));

  // 3. Dispatch `change` (form libraries that only listen on change).
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return null;
}
