import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { storageContexts } from "../helpers/extension";

let h: Awaited<ReturnType<typeof storageContexts>>;
let selector: typeof import("@/content/element-selector");
beforeEach(async () => {
  h = await storageContexts();
  selector = await import("@/content/element-selector");
  vi.useFakeTimers();
});
afterEach(() => {
  selector.stopElementSelector();
  vi.clearAllTimers();
});

test("banner Cancel reaches its handler while page clicks remain blocked", () => {
  const button = document.createElement("button");
  document.body.append(button);
  const click = vi.fn();
  button.addEventListener("click", click);
  selector.startElementSelector();
  fireEvent.click(button);
  expect(click).not.toHaveBeenCalled();
  expect(selector.isElementSelectorActive()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel (Esc)" }));
  expect(selector.isElementSelectorActive()).toBe(false);
  expect(
    screen.queryByRole("button", { name: "Cancel (Esc)" }),
  ).not.toBeInTheDocument();
  fireEvent.click(button);
  expect(click).toHaveBeenCalledOnce();
});

test("Escape cancels selection and password clicks never register", async () => {
  const el = document.createElement("input");
  el.type = "password";
  document.body.append(el);
  selector.startElementSelector();
  fireEvent.click(el);
  expect(await h.a.getTrackedInputs()).toEqual([]);
  expect(selector.isElementSelectorActive()).toBe(true);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(selector.isElementSelectorActive()).toBe(false);
});

test("selecting a field persists its signature, restores styles and focuses it", async () => {
  const el = document.createElement("textarea");
  el.id = "notes";
  el.style.outline = "1px solid red";
  document.body.append(el);
  selector.startElementSelector();
  fireEvent.mouseOver(el);
  expect(el.style.outline).not.toBe("1px solid red");
  fireEvent.click(el);
  await vi.advanceTimersByTimeAsync(1100);
  expect(await h.a.getTrackedInputs()).toEqual([
    expect.objectContaining({
      origin: location.origin,
      pathname: "/form",
      inputSignature: "id:notes",
    }),
  ]);
  expect(el.style.outline).toBe("1px solid red");
  expect(el).toHaveFocus();
  expect(selector.isElementSelectorActive()).toBe(false);
});

for (const tag of ["input", "textarea"] as const) {
  test.each(["readonly", "disabled", "fieldset", "inert"])(
    `${tag}: %s prevents highlighting and registration`,
    async (lock) => {
      const field = document.createElement(tag);
      const parent = document.createElement(
        lock === "fieldset" ? "fieldset" : "div",
      );
      parent.append(field);
      document.body.append(parent);
      if (lock === "fieldset") parent.setAttribute("disabled", "");
      else if (lock === "inert") parent.setAttribute("inert", "");
      else field.setAttribute(lock, "");
      selector.startElementSelector();
      fireEvent.mouseOver(field);
      fireEvent.click(field);
      expect(field.style.outline).toBe("");
      expect(await h.a.getTrackedInputs()).toEqual([]);
    },
  );
}
