type SupportedElement = HTMLInputElement | HTMLTextAreaElement;

const insertionError = "This field couldn’t accept the snippet with Undo support.";

/**
 * Replace the field as a native edit, preserving the browser's undo/redo stack.
 * execCommand is deprecated, but direct value setters cannot create an undoable
 * edit. There is currently no equivalent replacement for insertText.
 * Return an error rather than silently falling back to a destructive value setter.
 */
export const setNativeValue = (
  el: SupportedElement,
  value: string,
): string | null => {
  const document = el.ownerDocument;
  if (!el.isConnected || typeof document.execCommand !== "function") {
    return insertionError;
  }

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const direction = el.selectionDirection;
  let inputFired = false;
  let inserted = false;
  const recordInput = () => {
    inputFired = true;
  };

  el.addEventListener("input", recordInput, true);
  try {
    el.focus({ preventScroll: true });
    // A page may redirect focus, or the field may have become inert/disabled.
    // Never send an editing command to a different field in that case.
    const root = el.getRootNode() as Document | ShadowRoot;
    if (root.activeElement !== el) return insertionError;

    // select(), unlike setSelectionRange(), also works for Chrome's email and
    // number inputs. Unsupported controls (e.g. dates) reject insertText.
    el.select();
    if (root.activeElement !== el) return insertionError;
    inserted = document.execCommand("insertText", false, value);
  } catch {
    inserted = false;
  } finally {
    el.removeEventListener("input", recordInput, true);
    if (!inserted && start !== null && end !== null) {
      try {
        el.setSelectionRange(start, end, direction ?? undefined);
      } catch {
        // Page handlers may have changed the control type during the attempt.
      }
    }
  }

  if (!inserted) return insertionError;

  // Chrome emits the native input event, including for controlled React fields.
  // Other browsers may omit it. Notify listeners once in either case.
  if (!inputFired) {
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return null;
};
