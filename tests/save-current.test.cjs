const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { createLoader } = require("./helpers/source.cjs");
test("Save current is available before typing and reads the value only on click", async () => {
  let value = "";
  let reads = 0;
  const saved = [];
  const load = createLoader({
    react: {
      ...React,
      useState: (value) => [value, () => {}],
      useRef: () => ({ current: null }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect() {},
    },
    "./hooks/use-snippets": {
      useSnippets: () => ({
        perInputSnippets: [],
        globalSnippets: [],
        reload: async () => {},
      }),
    },
    "./hooks/use-picker-position": {
      usePickerPosition: () => ({ top: 0, left: 0 }),
    },
    "./hooks/use-picker-keyboard": {
      usePickerKeyboard: () => ({
        highlightedIndex: -1,
        setHighlightedIndex() {},
      }),
    },
    "./hooks/use-picker-resize": {
      usePickerResize: () => ({ maxHeight: 320, onResizeStart() {} }),
    },
    "@/lib/storage": {
      createSnippet: (value) => ({ value }),
      saveInputSnippet: async (...args) => saved.push(args[3]),
      saveGlobalSnippet() {},
    },
  });
  const { Picker } = load("src/content/picker/index.tsx");
  const { PickerFooter } = load(
    "src/content/picker/components/picker-footer.tsx",
  );
  const tree = Picker({
    inputEl: {
      get value() {
        reads++;
        return value;
      },
    },
    compositeKey: "field",
    pageMeta: {},
    inputMeta: {},
    onClose() {},
  });
  function find(node, predicate) {
    if (!node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const result = find(child, predicate);
      if (result) return result;
    }
    return null;
  }
  const footer = find(tree, (node) => node.type === PickerFooter);
  const button = find(
    PickerFooter(footer.props),
    (node) => node.props?.children === "Save current",
  );
  assert.ok(button);
  assert.equal(reads, 0);
  await button.props.onClick();
  assert.equal(saved.length, 0);
  value = "  Newly typed text  ";
  await button.props.onClick();
  assert.deepEqual(saved, [{ value: "Newly typed text" }]);
});
