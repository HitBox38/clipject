import { vi } from "vitest";

/** jsdom lacks the browser editing command; native Undo is verified in Chromium. */
export function installEditingCommand(emitInput = true) {
  const command = vi.fn((_command: string, _showUI: boolean, value: string) => {
    const field = document.activeElement;
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      )
    )
      return false;
    const prototype =
      field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      field,
      value,
    );
    if (emitInput)
      field.dispatchEvent(
        new Event("input", { bubbles: true, composed: true }),
      );
    return true;
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: command,
    writable: true,
  });
  return command;
}
