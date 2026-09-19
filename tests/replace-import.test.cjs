const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  memoryStorage,
  snippet,
} = require("./helpers/source.cjs");
test("rejected replacement preserves all existing data", async () => {
  const memory = memoryStorage();
  const load = createLoader({
    "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
    "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
  });
  const c = load("src/lib/constants.ts");
  const old = {
    [c.STORAGE_KEY_GLOBAL_SNIPPETS]: [snippet("old")],
    [c.STORAGE_KEY_PER_INPUT_DB]: { old: {} },
    [c.STORAGE_KEY_TRACKED_INPUTS]: [{ old: true }],
  };
  memory.seed(old);
  memory.failWrites(true);
  await assert.rejects(
    load("src/lib/storage.ts").importAllData(
      {
        data: {
          globalSnippets: [snippet("new")],
          perInputDb: {},
          trackedInputs: [],
        },
      },
      "replace",
    ),
    /QUOTA_BYTES/,
  );
  assert.deepEqual(memory.read(), old);
  assert.equal(
    memory.calls.some((c) => c.type === "remove"),
    false,
  );
});
test("replacement clears old collections in one write and keeps preferences", async () => {
  const memory = memoryStorage();
  const load = createLoader({
    "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
    "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
  });
  const c = load("src/lib/constants.ts");
  memory.seed({
    [c.STORAGE_KEY_GLOBAL_SNIPPETS]: [snippet("old")],
    [c.STORAGE_KEY_PER_INPUT_DB]: { old: {} },
    [c.STORAGE_KEY_TRACKED_INPUTS]: [1],
    [c.STORAGE_KEY_THEME]: "dark",
  });
  await load("src/lib/storage.ts").importAllData(
    { data: { globalSnippets: [], perInputDb: {}, trackedInputs: [] } },
    "replace",
  );
  assert.equal(memory.calls.length, 1);
  assert.deepEqual(memory.read(), {
    [c.STORAGE_KEY_GLOBAL_SNIPPETS]: [],
    [c.STORAGE_KEY_PER_INPUT_DB]: {},
    [c.STORAGE_KEY_TRACKED_INPUTS]: [],
    [c.STORAGE_KEY_THEME]: "dark",
  });
});
