const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { createLoader } = require("./helpers/source.cjs");

// The fixture models native value sanitization; Computer verification exercises
// the same inputs against Chrome's actual DOM implementation.
class Field {
  constructor(limit = -1, type = "text") {
    this.maxLength = limit;
    this.type = type;
    this.currentValue = "Original draft";
    this.events = [];
    this.writes = 0;
    this.focusCalls = 0;
  }
  get value() {
    return this.currentValue;
  }
  set value(value) {
    this.writes++;
    this.currentValue =
      this instanceof Textarea
        ? value.replace(/\r\n?/g, "\n")
        : value.replace(/[\r\n]/g, "");
    if (["email", "url"].includes(this.type)) {
      this.currentValue = this.currentValue.replace(
        /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,
        "",
      );
    }
  }
  cloneNode(deep) {
    assert.equal(deep, false);
    return new this.constructor(this.maxLength, this.type);
  }
  dispatchEvent(event) {
    this.events.push(event.type);
  }
  focus() {
    this.focusCalls++;
  }
}
class Input extends Field {}
class Textarea extends Field {}
const globals = { HTMLInputElement: Input, HTMLTextAreaElement: Textarea };

for (const FieldType of [Input, Textarea]) {
  for (const [name, limit, value, accepted] of [
    ["oversize", 5, "123456", false],
    ["exact limit", 5, "12345", true],
    ["short snippet", 5, "123", true],
    ["zero limit", 0, "a", false],
    ["empty snippet at zero", 0, "", true],
    ["unset limit", -1, "Long text without a limit", true],
    ["emoji uses two UTF-16 units", 1, "😀", false],
    ["emoji fits exactly two units", 2, "😀", true],
  ]) {
    test(`${FieldType.name}: ${name}`, () => {
      const field = new FieldType(limit);
      const { setNativeValue } = createLoader({}, globals)("src/lib/paste.ts");
      const result = setNativeValue(field, value);
      if (accepted) {
        assert.equal(result, null);
        assert.equal(field.value, value);
        assert.deepEqual(field.events, ["input", "change"]);
        assert.equal(field.writes, 1);
      } else {
        assert.match(result, new RegExp(`${limit}-character limit`));
        assert.match(result, /shorter snippet or edit it in the library/);
        assert.equal(field.value, "Original draft");
        assert.equal(field.writes, 0);
        assert.deepEqual(field.events, []);
      }
    });
  }
}

for (const [name, field, value, expected] of [
  ["single-line newlines", new Input(2), "a\r\nb", "ab"],
  ["textarea CRLF", new Textarea(3), "a\r\nb", "a\nb"],
  ["URL whitespace", new Input(3, "url"), "  abc \n", "abc"],
  ["email whitespace", new Input(3, "email"), " abc\r\n ", "abc"],
  ["irrelevant number maxlength", new Input(1, "number"), "123", "123"],
]) {
  test(`length check respects browser normalization: ${name}`, () => {
    const { setNativeValue } = createLoader({}, globals)("src/lib/paste.ts");
    assert.equal(setNativeValue(field, value), null);
    assert.equal(field.value, expected);
  });
}

test("a textarea newline still counts toward its limit", () => {
  const field = new Textarea(2);
  const { setNativeValue } = createLoader({}, globals)("src/lib/paste.ts");
  assert.match(setNativeValue(field, "a\r\nb"), /2-character limit/);
  assert.equal(field.value, "Original draft");
  assert.deepEqual(field.events, []);
});

test("picker reads the latest limit and keeps draft and picker after rejection", () => {
  let onSelect;
  let closed = 0;
  const feedback = [];
  let stateIndex = 0;
  const load = createLoader(
    {
      react: {
        ...React,
        useState: (value) => {
          const index = stateIndex++;
          return [value, (next) => index === 1 && feedback.push(next)];
        },
        useRef: () => ({ current: null }),
        useMemo: (fn) => fn(),
        useCallback: (fn) => fn,
        useEffect() {},
      },
      "./hooks/use-snippets": {
        useSnippets: () => ({ perInputSnippets: [], globalSnippets: [] }),
      },
      "./hooks/use-picker-position": {
        usePickerPosition: () => ({ top: 0, left: 0 }),
      },
      "./hooks/use-picker-keyboard": {
        usePickerKeyboard: (options) => {
          onSelect = options.onSelect;
          return { highlightedIndex: -1, setHighlightedIndex() {} };
        },
      },
      "./hooks/use-picker-resize": {
        usePickerResize: () => ({ maxHeight: 320, onResizeStart() {} }),
      },
      "@/lib/storage": {},
    },
    globals,
  );
  const field = new Input(20);
  load("src/content/picker/index.tsx").Picker({
    inputEl: field,
    onClose: () => closed++,
  });
  field.maxLength = 2;
  onSelect({ snippet: { value: "Snippet text" } });
  assert.match(feedback.at(-1), /2-character limit/);
  assert.equal(closed, 0);
  assert.equal(field.value, "Original draft");
  assert.equal(field.focusCalls, 0);
  assert.deepEqual(field.events, []);
  field.maxLength = 20;
  onSelect({ snippet: { value: "Snippet text" } });
  assert.equal(field.value, "Snippet text");
  assert.equal(closed, 1);
  assert.equal(field.focusCalls, 1);
});
