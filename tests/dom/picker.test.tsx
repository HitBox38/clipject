import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { input, page, snippet } from "../helpers/data";
import { storageContexts } from "../helpers/extension";

let h: Awaited<ReturnType<typeof storageContexts>>;
let target: HTMLTextAreaElement;
beforeEach(async () => {
  h = await storageContexts();
  target = document.createElement("textarea");
  target.setAttribute("aria-label", "Page field");
  document.body.append(target);
  // jsdom has no layout or scrolling; interactions and hooks remain real.
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue(
    new DOMRect(20, 20, 300, 80),
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(cleanup);

async function renderPicker() {
  const { Picker } = await import("@/content/picker");
  const onClose = vi.fn();
  render(
    <Picker
      inputEl={target}
      compositeKey="field"
      pageMeta={page}
      inputMeta={input}
      onClose={onClose}
    />,
  );
  await screen.findByRole("dialog", { name: "ClipJect snippet picker" });
  return { user: userEvent.setup(), onClose };
}

test("Save current is available before typing and only reads the value on click", async () => {
  const reads = vi.spyOn(target, "value", "get");
  const { user } = await renderPicker();
  const save = screen.getByRole("button", { name: "Save current" });
  expect(reads).not.toHaveBeenCalled();
  await user.click(save);
  expect(await h.a.getInputEntry("field")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("This field is empty");
  target.value = "  Newly typed text  ";
  await user.click(save);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Saved for this field",
    ),
  );
  expect((await h.a.getInputEntry("field"))?.snippets[0].value).toBe(
    "Newly typed text",
  );
});

test("per-field snippets precede globals; search filters and click inserts", async () => {
  await h.a.saveGlobalSnippet(snippet("g", "Global greeting"));
  await h.a.saveInputSnippet(
    "field",
    page,
    input,
    snippet("i", "Field greeting"),
  );
  const { user, onClose } = await renderPicker();
  await screen.findByRole("button", { name: "Global greeting" });
  const field = screen.getByRole("button", { name: "Field greeting" });
  const global = screen.getByRole("button", { name: "Global greeting" });
  expect(
    field.compareDocumentPosition(global) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  await user.type(screen.getByPlaceholderText(/search/i), "Global");
  expect(
    screen.queryByRole("button", { name: "Field greeting" }),
  ).not.toBeInTheDocument();
  await user.click(global);
  expect(target).toHaveValue("Global greeting");
  expect(onClose).toHaveBeenCalledOnce();
});

test.each(["This field", "Global"])(
  "adding a %s snippet uses real React state and preserves newlines",
  async (scope) => {
    await h.a.saveGlobalSnippet(snippet("existing", "Do not insert"));
    const { user, onClose } = await renderPicker();
    await user.click(screen.getByRole("button", { name: /Add new/ }));
    const editor = screen.getByLabelText("Snippet text");
    await user.type(editor, "First{Enter}Second");
    expect(editor).toHaveValue("First\nSecond");
    expect(target).toHaveValue("");
    expect(onClose).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Label (optional)"), "Two lines");
    await user.click(screen.getByRole("button", { name: scope }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /Two lines/ });
    const saved =
      scope === "Global"
        ? (await h.a.getGlobalSnippets()).at(-1)
        : (await h.a.getInputEntry("field"))?.snippets[0];
    expect(saved).toMatchObject({ label: "Two lines", value: "First\nSecond" });
  },
);

test("save failures keep the add form draft available for retry", async () => {
  const { user } = await renderPicker();
  await user.click(screen.getByRole("button", { name: /Add new/ }));
  await user.type(screen.getByLabelText("Snippet text"), "Keep my draft");
  h.failWrites(true);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your draft is still here",
  );
  expect(screen.getByLabelText("Snippet text")).toHaveValue("Keep my draft");
  h.failWrites(false);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByRole("button", { name: "Keep my draft" });
});

test("Escape exits add mode, then closes browsing; empty results do not intercept Enter", async () => {
  const { user, onClose } = await renderPicker();
  await user.click(screen.getByRole("button", { name: /Add new/ }));
  await user.keyboard("{Escape}");
  expect(screen.queryByLabelText("Snippet text")).not.toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  fireEvent(document, event);
  expect(event.defaultPrevented).toBe(false);
  await user.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledOnce();
});
