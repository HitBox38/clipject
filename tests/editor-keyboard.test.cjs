const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { createLoader } = require("./helpers/source.cjs");
test("editing disables document keyboard interception; browsing still selects", () => {
  const listeners = new Map();
  const cleanups = [];
  let selected = 0;
  let closed = 0;
  const document = {
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
  };
  const load = createLoader(
    {
      react: {
        useState: () => [0, () => {}],
        useRef: (current) => ({ current }),
        useCallback: (fn) => fn,
        useEffect: (fn) => {
          const cleanup = fn();
          if (cleanup) cleanups.push(cleanup);
        },
      },
    },
    { document },
  );
  const { usePickerKeyboard } = load(
    "src/content/picker/hooks/use-picker-keyboard.ts",
  );
  const options = {
    items: [{ snippet: { value: "saved" } }],
    onSelect() {
      selected++;
    },
    onClose() {
      closed++;
    },
  };
  usePickerKeyboard({ ...options, enabled: false });
  assert.equal(listeners.size, 0);
  usePickerKeyboard({ ...options, enabled: true });
  let prevented = 0;
  listeners.get("keydown")({
    key: "Enter",
    preventDefault() {
      prevented++;
    },
  });
  listeners.get("keydown")({
    key: "Escape",
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(selected, 1);
  assert.equal(closed, 1);
  assert.equal(prevented, 2);
  for (const cleanup of cleanups) cleanup();
  assert.equal(listeners.size, 0);
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
