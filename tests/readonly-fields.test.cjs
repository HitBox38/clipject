const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { createLoader } = require("./helpers/source.cjs");

class Element {
  constructor() {
    this.children = [];
    this.style = {};
    this.dataset = {};
  }
  appendChild(child) {
    this.children.push(child);
  }
  contains(target) {
    return target === this || this.children.some((c) => c.contains(target));
  }
  addEventListener() {}
}
class Input extends Element {
  constructor() {
    super();
    this.type = "text";
    this.isConnected = true;
    this.readOnly = false;
    this.disabled = false;
    this.disabledByFieldset = false;
    this.inertAncestor = null;
    this.value = "Original text";
    this.events = [];
    this.focusCalls = 0;
  }
  matches(selector) {
    assert.equal(selector, ":disabled");
    return this.disabled || this.disabledByFieldset;
  }
  closest(selector) {
    assert.equal(selector, "[inert]");
    return this.inertAncestor;
  }
  dispatchEvent(event) {
    this.events.push(event.type);
  }
  focus() {
    this.focusCalls++;
  }
}
class Textarea extends Input {}
const globals = {
  HTMLElement: Element,
  HTMLInputElement: Input,
  HTMLTextAreaElement: Textarea,
};
const locks = [
  ["read-only", (field) => (field.readOnly = true)],
  ["disabled", (field) => (field.disabled = true)],
  ["disabled fieldset", (field) => (field.disabledByFieldset = true)],
  ["inert ancestor", (field) => (field.inertAncestor = new Element())],
];

for (const Field of [Input, Textarea]) {
  for (const [name, lock] of locks) {
    test(`${Field.name}: ${name} fields cannot be selected or changed`, () => {
      let registrations = 0;
      const listeners = new Map();
      const document = {
        body: new Element(),
        createElement: () => new Element(),
        addEventListener: (name, fn) => listeners.set(name, fn),
      };
      const load = createLoader(
        {
          "@/lib/storage": {
            addTrackedInput() {
              registrations++;
            },
          },
        },
        { ...globals, document },
      );
      const { isSupportedField } = load("src/lib/keys.ts");
      const { setNativeValue } = load("src/lib/paste.ts");
      const field = new Field();
      assert.equal(isSupportedField(field), true);
      lock(field);
      assert.equal(isSupportedField(field), false);
      load("src/content/element-selector.ts").startElementSelector();
      listeners.get("mouseover")({ target: field });
      assert.equal(field.style.outline, undefined);
      listeners.get("click")({
        target: field,
        preventDefault() {},
        stopPropagation() {},
      });
      assert.equal(registrations, 0);
      setNativeValue(field, "Snippet text");
      assert.equal(field.value, "Original text");
      assert.deepEqual(field.events, []);
    });
  }
}

test("editable fields still receive the snippet and input/change events", () => {
  const load = createLoader({}, globals);
  for (const Field of [Input, Textarea]) {
    const field = new Field();
    load("src/lib/paste.ts").setNativeValue(field, "Snippet text");
    assert.equal(field.value, "Snippet text");
    assert.deepEqual(field.events, ["input", "change"]);
  }
});

for (const [name, lock] of [
  ...locks,
  ["detached", (field) => (field.isConnected = false)],
]) {
  test(`picker closes without inserting when its target becomes ${name}`, () => {
    let onSelect;
    let closeCalls = 0;
    const load = createLoader(
      {
        react: {
          ...React,
          useState: (value) => [value, () => {}],
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
    const field = new Input();
    load("src/content/picker/index.tsx").Picker({
      inputEl: field,
      onClose: () => closeCalls++,
    });
    lock(field);
    onSelect({ snippet: { value: "Snippet text" } });
    assert.equal(field.value, "Original text");
    assert.deepEqual(field.events, []);
    assert.equal(field.focusCalls, 0);
    assert.equal(closeCalls, 1);
  });
}
