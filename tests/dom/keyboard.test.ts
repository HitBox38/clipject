import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { usePickerKeyboard } from "@/content/picker/hooks/use-picker-keyboard";
import type { SnippetItemData } from "@/content/picker/types";
import { snippet } from "../helpers/data";

afterEach(cleanup);
let pickerRef: { current: HTMLDivElement };
let search: HTMLInputElement;
beforeEach(() => {
  const host = document.createElement("div");
  document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const picker = document.createElement("div");
  search = document.createElement("input");
  picker.append(search);
  shadow.append(picker);
  pickerRef = { current: picker };
});
const items: SnippetItemData[] = ["a", "b"].map((id) => ({
  snippet: snippet(id),
  scope: "global",
}));
const key = (
  key: string,
  target: EventTarget = search,
  extra: KeyboardEventInit = {},
) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...extra,
  });
  act(() => target.dispatchEvent(event));
  return event;
};

test("disabled editor leaves keyboard native; browsing selects and Escape closes", () => {
  const onSelect = vi.fn(),
    onClose = vi.fn();
  const { rerender, unmount } = renderHook(
    ({ enabled }) =>
      usePickerKeyboard({ pickerRef, enabled, items, onSelect, onClose }),
    { initialProps: { enabled: false } },
  );
  expect(key("Enter").defaultPrevented).toBe(false);
  expect(onSelect).not.toHaveBeenCalled();
  rerender({ enabled: true });
  expect(key("ArrowDown").defaultPrevented).toBe(true);
  key("Enter");
  expect(onSelect).toHaveBeenLastCalledWith(items[1]);
  key("ArrowDown");
  key("Enter");
  expect(onSelect).toHaveBeenLastCalledWith(items[0]);
  key("ArrowUp");
  key("Enter");
  expect(onSelect).toHaveBeenLastCalledWith(items[1]);
  key("Escape");
  expect(onClose).toHaveBeenCalledOnce();
  unmount();
  expect(key("Enter").defaultPrevented).toBe(false);
});

test("buttons inside Shadow DOM and IME composition retain native keys", () => {
  const onSelect = vi.fn();
  renderHook(() =>
    usePickerKeyboard({ pickerRef, items, onSelect, onClose: vi.fn() }),
  );
  const host = document.createElement("div");
  document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const button = document.createElement("button");
  shadow.append(button);
  expect(key("Enter", button).defaultPrevented).toBe(false);
  expect(key("Enter", document, { isComposing: true }).defaultPrevented).toBe(
    false,
  );
  expect(onSelect).not.toHaveBeenCalled();
});

test("empty results leave Enter and arrows alone", () => {
  const onSelect = vi.fn();
  renderHook(() =>
    usePickerKeyboard({ pickerRef, items: [], onSelect, onClose: vi.fn() }),
  );
  for (const value of ["Enter", "ArrowDown", "ArrowUp"]) {
    expect(key(value).defaultPrevented).toBe(false);
  }
  expect(onSelect).not.toHaveBeenCalled();
});

test("filtering uses fresh items and clamps a previous highlight", () => {
  const onSelect = vi.fn();
  const { rerender } = renderHook(
    ({ values }) =>
      usePickerKeyboard({
        pickerRef,
        items: values,
        onSelect,
        onClose: vi.fn(),
      }),
    { initialProps: { values: items } },
  );
  fireEvent.keyDown(search, { key: "ArrowDown" });
  rerender({ values: [items[0]] });
  key("Enter");
  expect(onSelect).toHaveBeenCalledWith(items[0]);
});

test("host fields, modifier keys and cancelled events keep native behavior", () => {
  const onSelect = vi.fn();
  renderHook(() =>
    usePickerKeyboard({ pickerRef, items, onSelect, onClose: vi.fn() }),
  );
  const hostField = document.createElement("textarea");
  document.body.append(hostField);
  for (const value of ["Enter", "ArrowUp", "ArrowDown"]) {
    expect(key(value, hostField).defaultPrevented).toBe(false);
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      expect(key(value, search, { [modifier]: true }).defaultPrevented).toBe(
        false,
      );
    }
  }
  const cancelled = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  cancelled.preventDefault();
  act(() => search.dispatchEvent(cancelled));
  key("Enter", search, { keyCode: 229 });
  expect(onSelect).not.toHaveBeenCalled();
});
