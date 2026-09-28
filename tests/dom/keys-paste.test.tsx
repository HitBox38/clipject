import { installEditingCommand } from "../helpers/editing";
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
    installEditingCommand();
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

test("shared names use unique placeholders and duplicate IDs use unique labels", () => {
  document.body.innerHTML =
    '<input name="note" placeholder="First"><input name="note" placeholder="Second">';
  let fields = document.querySelectorAll("input");
  expect(computeInputSignature(fields[0])).toBe("ph:First");
  expect(computeInputSignature(fields[1])).toBe("ph:Second");
  document.body.innerHTML =
    '<input id="duplicate" aria-label="First"><input id="duplicate" aria-label="Second">';
  fields = document.querySelectorAll("input");
  expect(computeInputSignature(fields[0])).toBe("aria:First");
  expect(computeInputSignature(fields[1])).toBe("aria:Second");
});
test("identical attributes fall back to separate paths and selector characters are literal", () => {
  document.body.innerHTML = '<input name="shared"><input name="shared">';
  const fields = document.querySelectorAll("input");
  expect(computeInputSignature(fields[0])).toBe("path:input:nth-of-type(1)");
  expect(computeInputSignature(fields[1])).toBe("path:input:nth-of-type(2)");
  fields[0].id = 'note["#"]';
  expect(computeInputSignature(fields[0])).toBe('id:note["#"]');
});

test("ambiguous legacy snippets stay stored without matching either repeated field", async () => {
  const { storageContexts } = await import("../helpers/extension");
  const h = await storageContexts();
  const { page, input, snippet } = await import("../helpers/data");
  const legacyKey = "https://source.example/form::Source::name:shared";
  await h.a.saveInputSnippet(
    legacyKey,
    page,
    { ...input, signature: "name:shared" },
    snippet("legacy"),
  );
  document.title = "Source";
  document.body.innerHTML =
    '<input name="shared" placeholder="First"><input name="shared" placeholder="Second">';
  for (const field of document.querySelectorAll("input")) {
    const key = buildCompositeKey(
      computePageKey().key,
      computeInputSignature(field),
    );
    expect(key).not.toBe(legacyKey);
    expect(await h.a.getInputEntry(key)).toBeNull();
  }
  expect((await h.a.getInputEntry(legacyKey))?.snippets[0].id).toBe("legacy");
});
