import { test, expect } from "./extension";

test("native input types preserve undo, redo, repeated inserts and event counts", async ({
  page,
}) => {
  const results = await page.evaluate(() => {
    const results = [];
    for (const type of [
      "text",
      "textarea",
      "search",
      "url",
      "tel",
      "email",
      "number",
    ]) {
      const field = document.createElement(
        type === "textarea" ? "textarea" : "input",
      );
      if (field instanceof HTMLInputElement) field.type = type;
      const draft = type === "number" ? "123" : "Original draft",
        snippet = type === "number" ? "456" : "Snippet text",
        second = type === "number" ? "789" : "Second snippet";
      field.value = draft;
      document.body.append(field);
      let inputs = 0,
        changes = 0;
      field.addEventListener("input", () => inputs++);
      field.addEventListener("change", () => changes++);
      const error = window.clipjectTest.setNativeValue(field, snippet);
      const inserted = field.value,
        initialEvents = [inputs, changes];
      document.execCommand("undo");
      const undone = field.value;
      document.execCommand("redo");
      const redone = field.value,
        historyInputs = inputs;
      const secondError = window.clipjectTest.setNativeValue(field, second);
      document.execCommand("undo");
      const undoSecond = field.value;
      document.execCommand("undo");
      const undoBoth = field.value;
      results.push({
        type,
        error,
        secondError,
        inserted,
        initialEvents,
        undone,
        redone,
        historyInputs,
        undoSecond,
        undoBoth,
        draft,
        snippet,
      });
      field.remove();
    }
    return results;
  });
  for (const r of results) {
    expect(r.error, r.type).toBeNull();
    expect(r.secondError, r.type).toBeNull();
    expect(r.inserted, r.type).toBe(r.snippet);
    expect(r.initialEvents, r.type).toEqual([1, 1]);
    expect(r.undone, r.type).toBe(r.draft);
    expect(r.redone, r.type).toBe(r.snippet);
    expect(r.historyInputs, r.type).toBe(3);
    expect(r.undoSecond, r.type).toBe(r.snippet);
    expect(r.undoBoth, r.type).toBe(r.draft);
  }
});

test("browser normalization and maxlength preserve drafts or make undoable edits", async ({
  page,
}) => {
  const cases: [string, number, string, string | null][] = [
    ["text", 5, "123456", null],
    ["textarea", 5, "123456", null],
    ["text", 0, "a", null],
    ["text", 0, "", ""],
    ["text", 1, "😀", null],
    ["text", 2, "😀", "😀"],
    ["text", 2, "a\r\nb", "ab"],
    ["textarea", 3, "a\r\nb", "a\nb"],
    ["textarea", 2, "a\r\nb", null],
    ["url", 3, "  abc \n", "abc"],
    ["email", 3, " abc\r\n ", "abc"],
    ["number", 1, "123", "123"],
  ];
  for (const [type, limit, value, expected] of cases) {
    const result = await page.evaluate(
      ({ type, limit, value }) => {
        const field = document.createElement(
          type === "textarea" ? "textarea" : "input",
        );
        if (field instanceof HTMLInputElement) field.type = type;
        field.maxLength = limit;
        const draft = type === "number" ? "9" : "Old draft";
        field.value = draft;
        document.body.append(field);
        let edits = 0;
        for (const event of ["input", "change"])
          field.addEventListener(event, () => edits++);
        const error = window.clipjectTest.setNativeValue(field, value),
          inserted = field.value;
        if (!error) document.execCommand("undo");
        const undone = field.value;
        field.remove();
        return { error, inserted, edits, undone, draft };
      },
      { type, limit, value },
    );
    if (expected === null) {
      expect(result.error).toContain("character limit");
      expect(result.inserted).toBe(result.draft);
      expect(result.edits).toBe(0);
    } else {
      expect(result.error).toBeNull();
      expect(result.inserted).toBe(expected);
      expect(result.undone).toBe(result.draft);
    }
  }
});

test("unsupported controls and rejected editing commands preserve values and selection", async ({
  page,
}) => {
  const results = await page.evaluate(() => {
    const values = [];
    for (const type of ["date", "time"]) {
      const field = document.createElement("input");
      field.type = type;
      field.value = type === "date" ? "2026-09-28" : "13:30";
      document.body.append(field);
      const original = field.value,
        error = window.clipjectTest.setNativeValue(field, "unsupported");
      values.push({ original, after: field.value, error });
      field.remove();
    }
    const field = document.createElement("textarea");
    field.value = "Keep this draft";
    document.body.append(field);
    field.focus();
    field.setSelectionRange(2, 6);
    const originalCommand = document.execCommand;
    document.execCommand = () => false;
    try {
      return {
        values,
        error: window.clipjectTest.setNativeValue(field, "replacement"),
        value: field.value,
        selection: [field.selectionStart, field.selectionEnd],
      };
    } finally {
      document.execCommand = originalCommand;
      field.remove();
    }
  });
  for (const r of results.values) {
    expect(typeof r.error).toBe("string");
    expect(r.after).toBe(r.original);
  }
  expect(typeof results.error).toBe("string");
  expect(results.value).toBe("Keep this draft");
  expect(results.selection).toEqual([2, 6]);
});

test("modal overlays escape clipping and dispose on close or target removal", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const dialog = document.createElement("dialog");
    dialog.style.cssText =
      "transform:translate(10px,10px);overflow:hidden;width:200px;height:100px";
    const field = document.createElement("textarea");
    dialog.append(field);
    document.body.append(dialog);
    dialog.showModal();
    field.focus();
    const make = () => {
      const host = document.createElement("div");
      host.style.cssText =
        "position:fixed;width:0;height:0;overflow:visible;pointer-events:none;background:transparent";
      const shadow = host.attachShadow({ mode: "open" }),
        button = document.createElement("button");
      button.style.cssText =
        "position:fixed;left:20px;top:20px;width:160px;height:40px;pointer-events:auto";
      shadow.append(button);
      let dismissed = 0;
      const dispose = window.clipjectTest.placeOverlay(host, field, () => {
        dismissed++;
        dispose();
      });
      return {
        host,
        button,
        dispose,
        get dismissed() {
          return dismissed;
        },
      };
    };
    const overlay = make();
    overlay.button.focus();
    const initial = {
      inDialog: overlay.host.parentElement === dialog,
      topLayer: overlay.host.matches(":popover-open"),
      hit: document.elementFromPoint(40, 40) === overlay.host,
      focused: overlay.host.shadowRoot?.activeElement === overlay.button,
      x: overlay.button.getBoundingClientRect().left,
    };
    dialog.close();
    await new Promise((r) => setTimeout(r, 0));
    const closed = {
      dismissed: overlay.dismissed,
      connected: overlay.host.isConnected,
    };
    dialog.showModal();
    const second = make();
    field.remove();
    await new Promise((r) => setTimeout(r, 0));
    const removed = {
      dismissed: second.dismissed,
      connected: second.host.isConnected,
    };
    dialog.remove();
    document.body.append(field);
    const ordinary = make();
    const body = ordinary.host.parentElement === document.body,
      hit = document.elementFromPoint(40, 40) === ordinary.host;
    ordinary.dispose();
    field.remove();
    return { initial, closed, removed, body, hit };
  });
  expect(result).toEqual({
    initial: {
      inDialog: true,
      topLayer: true,
      hit: true,
      focused: true,
      x: 20,
    },
    closed: { dismissed: 1, connected: false },
    removed: { dismissed: 1, connected: false },
    body: true,
    hit: true,
  });
});

test("native focus and selection boundaries recheck a lowered maxlength", async ({
  page,
}) => {
  for (const phase of ["focus", "select"] as const) {
    const result = await page.evaluate((phase) => {
      const field = document.createElement("textarea");
      field.value = "Keep draft";
      field.maxLength = 20;
      document.body.append(field);
      let edits = 0;
      for (const event of ["input", "change"])
        field.addEventListener(event, () => edits++);
      const original = field[phase].bind(field);
      field[phase] = () => {
        original();
        field.maxLength = 2;
      };
      const error = window.clipjectTest.setNativeValue(field, "Snippet text");
      const value = field.value;
      field.remove();
      return { error, value, edits };
    }, phase);
    expect(result.error).toContain("2-character limit");
    expect(result.value).toBe("Keep draft");
    expect(result.edits).toBe(0);
  }
});
