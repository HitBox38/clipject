const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  memoryStorage,
  snippet,
  page,
  input,
} = require("./helpers/source.cjs");
const React = require("react");
function findSave(node) {
  if (!node || typeof node !== "object") return null;
  if (node.props?.children === "Save") return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = findSave(child);
    if (found) return found;
  }
  return null;
}
for (const kind of ["global", "input"]) {
  test(kind + " editor can clear a saved label", async () => {
    const memory = memoryStorage();
    let stateIndex = 0;
    const load = createLoader({
      "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
      "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
      react: {
        ...React,
        useCallback: (fn) => fn,
        useState: () => [[true, "Edited value", "   "][stateIndex++], () => {}],
      },
      "@/components/ui/button": { Button: "button" },
      "@/components/ui/input": { Input: "input" },
      "@/components/ui/textarea": { Textarea: "textarea" },
    });
    const storage = load("src/lib/storage.ts");
    const saved = { ...snippet("s"), label: "Old label" };
    let writing;
    let tree;
    if (kind === "global") {
      await storage.saveGlobalSnippet(saved);
      tree = load(
        "src/options/global-snippets/components/snippet-row.tsx",
      ).SnippetRow({
        snippet: saved,
        onDelete() {},
        onEdit(id, patch) {
          writing = storage.updateGlobalSnippet(id, patch);
        },
      });
    } else {
      await storage.saveInputSnippet("field", page, input, saved);
      tree = load(
        "src/options/per-input-snippets/components/snippet-editor.tsx",
      ).SnippetEditor({
        snippet: saved,
        compositeKey: "field",
        onDelete() {},
        onEdit(key, id, patch) {
          writing = storage.updateInputSnippet(key, id, patch);
          return writing;
        },
      });
    }
    await findSave(tree).props.onClick();
    await writing;
    const result =
      kind === "global"
        ? (await storage.getGlobalSnippets())[0]
        : (await storage.getInputEntry("field")).snippets[0];
    assert.equal(result.label, "");
    assert.equal(result.value, "Edited value");
  });
}
