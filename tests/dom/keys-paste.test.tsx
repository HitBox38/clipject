import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  buildCompositeKey,
  buildInputMeta,
  buildTrackingFingerprint,
  computeInputSignature,
  computePageKey,
  isPasswordField,
  isSupportedField,
} from "@/lib/keys";
import { setNativeValue } from "@/lib/paste";

test("page identity follows origin, path and exact title, excluding query and hash", () => {
  document.title = "  Notes  ";
  history.replaceState(null, "", "/new?query=yes#fragment");
  const result = computePageKey();
  expect(result.key).toBe("https://source.example/new::Notes");
  expect(buildCompositeKey(result.key, "id:notes")).toBe(
    "https://source.example/new::Notes::id:notes",
  );
  expect(
    buildTrackingFingerprint(
      result.meta.origin,
      result.meta.pathname,
      "id:notes",
    ),
  ).toBe("https://source.example/new::id:notes");
});

test("input signature uses stable attributes in priority order", () => {
  const el = document.createElement("input");
  el.id = "notes";
  el.name = "note";
  el.setAttribute("aria-label", "Label");
  el.placeholder = "Hint";
  expect(computeInputSignature(el)).toBe("id:notes");
  el.removeAttribute("id");
  expect(computeInputSignature(el)).toBe("name:note");
  el.removeAttribute("name");
  expect(computeInputSignature(el)).toBe("aria:Label");
  el.removeAttribute("aria-label");
  expect(computeInputSignature(el)).toBe("ph:Hint");
});

test("DOM path fallback differentiates sibling fields by type", () => {
  document.body.innerHTML =
    "<form><div><input><span></span><input></div></form>";
  const fields = document.querySelectorAll("input");
  expect(computeInputSignature(fields[0])).toBe(
    "path:form > div > input:nth-of-type(1)",
  );
  expect(computeInputSignature(fields[1])).toBe(
    "path:form > div > input:nth-of-type(2)",
  );
});

test.each([
  "password",
  "hidden",
  "file",
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "image",
])("excludes %s fields", (type) => {
  const el = document.createElement("input");
  el.type = type;
  expect(isSupportedField(el)).toBe(false);
  expect(isPasswordField(el)).toBe(type === "password");
});

test("metadata records field type, identity and observation time", () => {
  vi.spyOn(Date, "now").mockReturnValue(42);
  const el = document.createElement("input");
  el.id = "email";
  el.type = "email";
  expect(buildInputMeta(el)).toEqual({
    signature: "id:email",
    tag: "input",
    type: "email",
    lastSeenAt: 42,
  });
  expect(isSupportedField(el)).toBe(true);
  expect(isSupportedField(document.createElement("textarea"))).toBe(true);
  expect(isSupportedField(document.createElement("div"))).toBe(false);
  expect(buildInputMeta(document.createElement("textarea"))).not.toHaveProperty(
    "type",
  );
});

test.each(["input", "textarea"] as const)(
  "paste updates a controlled React %s and emits bubbling input/change",
  (tag) => {
    function Controlled() {
      const [value, setValue] = useState("draft");
      const Tag = tag;
      return (
        <>
          <Tag
            aria-label="Notes"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <output data-testid="state">{value}</output>
        </>
      );
    }
    render(<Controlled />);
    const el = screen.getByRole("textbox") as
      HTMLInputElement | HTMLTextAreaElement;
    const onInput = vi.fn(),
      onChange = vi.fn();
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    try {
      act(() => setNativeValue(el, "שלום 👋 café"));
      expect(el).toHaveValue("שלום 👋 café");
      expect(screen.getByTestId("state")).toHaveTextContent("שלום 👋 café");
      expect(onInput).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener("input", onInput);
      document.removeEventListener("change", onChange);
    }
  },
);
