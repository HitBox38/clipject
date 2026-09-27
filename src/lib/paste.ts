import { isSupportedField } from "./keys";

/**
 * Programmatically set a value on an input/textarea and dispatch events
 * so that React, Vue, Angular, and vanilla JS listeners all detect the change.
 */

type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Set `value` on `el` using the native prototype setter (bypasses React's
 * synthetic value property) then dispatches `input` and `change` events.
 * Returns actionable feedback if the target is no longer editable.
 */
export const setNativeValue = (
  el: SupportedElement,
  value: string,
): string | null => {
  // Page scripts may lock or remove a field after the picker has opened.
  if (!el.isConnected) {
    return (
      "This field is no longer on the page. " +
      "Close this picker and select a field again."
    );
  }
  if (!isSupportedField(el)) {
    return (
      "This field is no longer editable. " +
      "Choose an editable field and try again."
    );
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
