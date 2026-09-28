import { beforeEach, expect, test, vi } from "vitest";
import { isSupportedField } from "@/lib/keys";
import { setNativeValue } from "@/lib/paste";
import { installEditingCommand } from "../helpers/editing";

beforeEach(() => {
  installEditingCommand();
});
for (const tag of ["input", "textarea"] as const) {
  test.each(["readonly", "disabled", "fieldset", "inert"])(
    `${tag}: %s fields cannot be edited`,
    (lock) => {
      const field = document.createElement(tag);
      field.value = "Original";
      const wrapper = document.createElement(
        lock === "fieldset" ? "fieldset" : "div",
      );
      wrapper.append(field);
      document.body.append(wrapper);
      if (lock === "fieldset") wrapper.setAttribute("disabled", "");
      else if (lock === "inert") wrapper.setAttribute("inert", "");
      else field.setAttribute(lock, "");
      expect(isSupportedField(field)).toBe(false);
      const input = vi.fn();
      field.addEventListener("input", input);
      expect(setNativeValue(field, "Snippet")).toMatch(/editable field/);
      expect(field.value).toBe("Original");
      expect(input).not.toHaveBeenCalled();
    },
  );
  test.each([
    [5, "123456", false],
    [5, "12345", true],
    [5, "123", true],
    [0, "a", false],
    [0, "", true],
    [-1, "Long text without a limit", true],
    [1, "😀", false],
    [2, "😀", true],
  ] as const)(
    `${tag}: maxlength %s with %j accepted=%s`,
    (limit, value, accepted) => {
      const field = document.createElement(tag);
      field.value = "Original draft";
      if (limit >= 0) field.maxLength = limit;
      document.body.append(field);
      const input = vi.fn(),
        change = vi.fn();
      field.addEventListener("input", input);
      field.addEventListener("change", change);
      const error = setNativeValue(field, value);
      if (accepted) {
        expect(error).toBeNull();
        expect(field.value).toBe(value);
        expect(input).toHaveBeenCalledOnce();
        expect(change).toHaveBeenCalledOnce();
      } else {
        expect(error).toContain(`${limit}-character limit`);
        expect(field.value).toBe("Original draft");
        expect(input).not.toHaveBeenCalled();
        expect(change).not.toHaveBeenCalled();
      }
    },
  );
}
test.each([
  ["text", 2, "a\r\nb", "ab"],
  ["textarea", 3, "a\r\nb", "a\nb"],
  ["url", 3, "  abc \n", "abc"],
  ["email", 3, " abc\r\n ", "abc"],
  ["number", 1, "123", "123"],
] as const)(
  "%s value normalization precedes length checking",
  (type, limit, value, expected) => {
    const field = document.createElement(
      type === "textarea" ? "textarea" : "input",
    );
    if (field instanceof HTMLInputElement) field.type = type;
    field.maxLength = limit;
    document.body.append(field);
    expect(setNativeValue(field, value)).toBeNull();
    expect(field.value).toBe(expected);
  },
);
test("textarea newline counts toward the limit", () => {
  const field = document.createElement("textarea");
  field.maxLength = 2;
  field.value = "Draft";
  document.body.append(field);
  expect(setNativeValue(field, "a\r\nb")).toContain("2-character limit");
  expect(field.value).toBe("Draft");
});
test("disabled fieldset exempts its first legend", () => {
  document.body.innerHTML =
    '<fieldset disabled><legend><input id="allowed"></legend><input id="blocked"></fieldset>';
  expect(isSupportedField(document.querySelector("#allowed")!)).toBe(true);
  expect(isSupportedField(document.querySelector("#blocked")!)).toBe(false);
});
test.each(["focus", "select"] as const)(
  "revalidates maxlength changed during %s",
  (phase) => {
    const field = document.createElement("textarea");
    field.value = "Draft";
    field.maxLength = 20;
    document.body.append(field);
    const original = field[phase].bind(field);
    vi.spyOn(field, phase).mockImplementation(() => {
      original();
      field.maxLength = 2;
    });
    expect(setNativeValue(field, "Snippet")).toContain("2-character limit");
    expect(field.value).toBe("Draft");
  },
);
test("failed native editing preserves selection and does not fall back to direct assignment", () => {
  const field = document.createElement("textarea");
  field.value = "Keep draft";
  document.body.append(field);
  field.setSelectionRange(2, 5);
  vi.mocked(document.execCommand).mockReturnValue(false);
  expect(setNativeValue(field, "Snippet")).toContain("Undo support");
  expect(field.value).toBe("Keep draft");
  expect([field.selectionStart, field.selectionEnd]).toEqual([2, 5]);
});
test("unsupported native command and detached field return errors", () => {
  const field = document.createElement("textarea");
  expect(setNativeValue(field, "Snippet")).toContain("no longer on the page");
  document.body.append(field);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: undefined,
  });
  expect(setNativeValue(field, "Snippet")).toContain("Undo support");
});
test("native command exceptions preserve the field", () => {
  const field = document.createElement("textarea");
  field.value = "Draft";
  document.body.append(field);
  vi.mocked(document.execCommand).mockImplementation(() => {
    throw new Error("Unavailable");
  });
  expect(setNativeValue(field, "Snippet")).toContain("Undo support");
  expect(field.value).toBe("Draft");
});
test("missing native input event is dispatched once", () => {
  installEditingCommand(false);
  const field = document.createElement("textarea");
  document.body.append(field);
  const input = vi.fn();
  field.addEventListener("input", input);
  expect(setNativeValue(field, "Snippet")).toBeNull();
  expect(input).toHaveBeenCalledOnce();
});
test("redirected focus never edits a different field", () => {
  const field = document.createElement("textarea"),
    other = document.createElement("textarea");
  document.body.append(field, other);
  field.addEventListener("focus", () => other.focus());
  expect(setNativeValue(field, "Snippet")).toContain("Undo support");
  expect(other.value).toBe("");
});
test.each(["focus", "select"] as const)(
  "editability changes during %s stop insertion",
  (phase) => {
    const field = document.createElement("textarea");
    field.value = "Draft";
    document.body.append(field);
    const original = field[phase].bind(field);
    vi.spyOn(field, phase).mockImplementation(() => {
      original();
      field.readOnly = true;
    });
    expect(setNativeValue(field, "Snippet")).toContain("editable field");
    expect(field.value).toBe("Draft");
  },
);
