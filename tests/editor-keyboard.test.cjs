const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { createLoader } = require("./helpers/source.cjs");

function fixture({ enabled = true, items } = {}) {
  const listeners = new Map();
  const cleanups = [];
  const refs = [];
  const selected = [];
  let closed = 0;
  let index = 0;
  let refIndex = 0;
  let navigation;
  const picker = {};
  const host = { closest: () => null };
  const search = { closest: () => null };
  const nativeControl = { closest: () => ({}) };
  const pickerRef = { current: picker };
  const load = createLoader(
    {
      react: {
        useState: () => [
          index,
          (next) => {
            index = typeof next === "function" ? next(index) : next;
          },
        ],
        useRef: (current) => (refs[refIndex++] ??= { current }),
        useCallback: (fn) => fn,
        useEffect: (fn) => {
          const cleanup = fn();
          if (cleanup) cleanups.push(cleanup);
        },
      },
    },
    {
      document: {
        addEventListener: (type, fn) => listeners.set(type, fn),
        removeEventListener: (type, fn) => {
          if (listeners.get(type) === fn) listeners.delete(type);
        },
      },
    },
  );
  const { usePickerKeyboard } = load(
    "src/content/picker/hooks/use-picker-keyboard.ts",
  );
  function render() {
    refIndex = 0;
    navigation = usePickerKeyboard({
      enabled,
      pickerRef,
      items: items ?? [
        { snippet: { value: "first" } },
        { snippet: { value: "second" } },
      ],
      onSelect: (item) => selected.push(item.snippet.value),
      onClose: () => closed++,
    });
  }
  render();
  return {
    selected,
    get closed() {
      return closed;
    },
    get highlightedIndex() {
      return navigation.highlightedIndex;
    },
    listeners,
    cleanup: () => cleanups.forEach((fn) => fn()),
    hover(index) {
      navigation.setHighlightedIndex(index);
      render();
    },
    key(key, source = "host", extra = {}) {
      let prevented = false;
      const target =
        source === "host" ? host :
          source === "search" ? search : nativeControl;
      listeners.get("keydown")?.({
        key,
        // The retargeted event target is deliberately not the search input.
        target: host,
        composedPath: () => source === "host" ? [host] : [target, picker],
        preventDefault: () => {
          prevented = true;
        },
        ...extra,
      });
      render();
      return prevented;
    },
  };
}

test("host Enter and arrow keys stay native even with a highlighted snippet", () => {
  const f = fixture();
  for (const key of ["Enter", "ArrowDown", "ArrowUp"]) {
    assert.equal(f.key(key), false);
  }
  f.hover(1);
  assert.equal(f.key("Enter"), false);
  // Returning to the field after explicit picker navigation remains safe.
  assert.equal(f.key("ArrowDown", "search"), true);
  assert.equal(f.key("Enter"), false);
  assert.deepEqual(f.selected, []);
});

test("search navigation and Enter select the highlighted snippet through Shadow DOM", () => {
  const f = fixture();
  assert.equal(f.key("ArrowDown", "search"), true);
  assert.equal(f.highlightedIndex, 1);
  assert.equal(f.key("Enter", "search"), true);
  assert.deepEqual(f.selected, ["second"]);
  assert.equal(f.key("ArrowDown", "search"), true);
  assert.equal(f.highlightedIndex, 0);
  assert.equal(f.key("ArrowUp", "search"), true);
  assert.equal(f.highlightedIndex, 1);
});

test("Escape closes from either the field or picker and listeners are cleaned up", () => {
  const f = fixture();
  assert.equal(f.key("Escape"), true);
  assert.equal(f.key("Escape", "button"), true);
  assert.equal(f.closed, 2);
  f.cleanup();
  assert.equal(f.listeners.size, 0);
});

test("editing disables document keyboard interception", () => {
  const f = fixture({ enabled: false });
  assert.equal(f.listeners.size, 0);
  assert.equal(f.key("Enter", "search"), false);
  assert.deepEqual(f.selected, []);
});

test("Picker passes disabled keyboard navigation while adding", () => {
  let options;
  const load = createLoader({
    react: {
      ...React,
      useState: () => [true, () => {}],
      useRef: () => ({ current: null }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect() {},
    },
    "./hooks/use-snippets": {
      useSnippets: () => ({
        perInputSnippets: [],
        globalSnippets: [],
        reload() {},
      }),
    },
    "./hooks/use-picker-keyboard": {
      usePickerKeyboard: (opts) => {
        options = opts;
        return { highlightedIndex: 0, setHighlightedIndex() {} };
      },
    },
    "./hooks/use-picker-position": {
      usePickerPosition: () => ({ top: 0, left: 0 }),
    },
    "./hooks/use-picker-resize": {
      usePickerResize: () => ({ maxHeight: 320, onResizeStart() {} }),
    },
    "./hooks/use-picker-search": {
      usePickerSearch: () => ({
        query: "",
        setQuery() {},
        filteredPerInput: [],
        filteredGlobal: [],
      }),
    },
    "@/lib/storage": {},
  });
  load("src/content/picker/index.tsx").Picker({
    inputEl: { value: "" },
    onClose() {},
  });
  assert.equal(options.enabled, false);
});

for (const [name, source, extra, items] of [
  ["focused button or select", "button", {}],
  ["IME composition", "search", { isComposing: true }],
  ["IME confirmation with legacy key code", "search", { keyCode: 229 }],
  ["already handled event", "search", { defaultPrevented: true }],
  ["Shift+Enter", "search", { shiftKey: true }],
  ["Ctrl+Enter", "search", { ctrlKey: true }],
  ["Cmd+Enter", "search", { metaKey: true }],
  ["Alt+Enter", "search", { altKey: true }],
  ["empty search results", "search", {}, []],
]) {
  test("picker leaves " + name + " keyboard events alone", () => {
    const f = fixture({ items });
    assert.equal(f.key("Enter", source, extra), false);
    assert.deepEqual(f.selected, []);
  });
}
