import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import {
  FOCUS_DEBOUNCE_MS,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_PER_INPUT_DB,
  STORAGE_KEY_TRACKED_INPUTS,
} from "@/lib/constants";
import { extensionHarness } from "../helpers/extension";

vi.mock("@/content/mount", () => ({
  mountPicker: vi.fn(),
  unmountPicker: vi.fn(),
}));
import { mountPicker, unmountPicker } from "@/content/mount";

let h: ReturnType<typeof extensionHarness>;
let a: HTMLInputElement, b: HTMLInputElement, untracked: HTMLInputElement;
// A content script initializes once per document. Keep that lifecycle here too.
beforeAll(async () => {
  h = extensionHarness();
  const { initObserver } = await import("@/content/observer");
  initObserver();
});
beforeEach(async () => {
  vi.useFakeTimers();
  await h.api.storage.local.set({
    [STORAGE_KEY_ENABLED]: true,
    [STORAGE_KEY_PER_INPUT_DB]: {},
    [STORAGE_KEY_TRACKED_INPUTS]: ["a", "b"].map((id) => ({
      origin: location.origin,
      pathname: "/form",
      inputSignature: `id:${id}`,
      registeredAt: 1,
    })),
  });
  await vi.advanceTimersByTimeAsync(0);
  document.body.innerHTML =
    '<input id="a"><input id="b"><input id="untracked">';
  a = document.querySelector<HTMLInputElement>("#a")!;
  b = document.querySelector<HTMLInputElement>("#b")!;
  untracked = document.querySelector<HTMLInputElement>("#untracked")!;
  fireEvent.mouseDown(document.body);
  vi.mocked(mountPicker).mockClear();
  vi.mocked(unmountPicker).mockClear();
});
afterEach(() => {
  fireEvent.mouseDown(document.body);
  vi.clearAllTimers();
});
const flush = () => vi.advanceTimersByTimeAsync(FOCUS_DEBOUNCE_MS + 1);

test("tabbing from a tracked field to an untracked field closes the old picker", async () => {
  a.focus();
  await flush();
  expect(mountPicker).toHaveBeenLastCalledWith(
    expect.objectContaining({ inputEl: a }),
  );
  untracked.focus();
  expect(unmountPicker).toHaveBeenCalled();
  vi.mocked(mountPicker).mockClear();
  await flush();
  expect(mountPicker).not.toHaveBeenCalled();
});

test("switching tracked fields drops the previous target before debounce", async () => {
  a.focus();
  await flush();
  vi.mocked(unmountPicker).mockClear();
  b.focus();
  expect(unmountPicker).toHaveBeenCalled();
  await flush();
  expect(mountPicker).toHaveBeenLastCalledWith(
    expect.objectContaining({ inputEl: b }),
  );
});

test("a stale focus timer never opens a picker on a nonfocused field", async () => {
  fireEvent.focusIn(a); // Notification arrives after focus has already moved.
  expect(document.activeElement).not.toBe(a);
  await flush();
  expect(mountPicker).not.toHaveBeenCalled();
});

test("disable storage event immediately closes and prevents reopening", async () => {
  a.focus();
  await flush();
  vi.mocked(unmountPicker).mockClear();
  await h.api.storage.local.set({ [STORAGE_KEY_ENABLED]: false });
  expect(unmountPicker).toHaveBeenCalled();
  vi.mocked(mountPicker).mockClear();
  b.focus();
  await flush();
  expect(mountPicker).not.toHaveBeenCalled();
});

test("password fields never mount even when registered", async () => {
  a.type = "password";
  a.focus();
  await flush();
  expect(mountPicker).not.toHaveBeenCalled();
});

test("adding a duplicate or changing identity closes a stale picker", async () => {
  a.focus();
  await flush();
  vi.mocked(unmountPicker).mockClear();
  const duplicate = a.cloneNode() as HTMLInputElement;
  document.body.append(duplicate);
  await vi.advanceTimersByTimeAsync(0);
  expect(unmountPicker).toHaveBeenCalled();
  duplicate.remove();
  a.blur();
  a.focus();
  await flush();
  vi.mocked(unmountPicker).mockClear();
  const unrelated = document.createElement("div");
  document.body.append(unrelated);
  await vi.advanceTimersByTimeAsync(0);
  expect(unmountPicker).not.toHaveBeenCalled();
  a.id = "changed";
  await vi.advanceTimersByTimeAsync(0);
  expect(unmountPicker).toHaveBeenCalled();
});
