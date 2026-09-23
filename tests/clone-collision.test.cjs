const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  memoryStorage,
  snippet,
  page,
  input,
} = require("./helpers/source.cjs");
test("cloning rejects an occupied destination without changing any data", async () => {
  const memory = memoryStorage();
  const load = createLoader({
    "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
    "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
  });
  const storage = load("src/lib/storage.ts");
  await storage.saveInputSnippet("source", page, input, snippet("source"));
  const key = "https://target.example/form::Source::id:notes";
  await storage.saveInputSnippet(
    key,
    { ...page, origin: "https://target.example" },
    input,
    snippet("destination"),
  );
  const before = memory.read();
  await assert.rejects(
    storage.cloneInputEntry(
      "source",
      "https://target.example",
      "/form",
      "Source",
    ),
    /destination already has snippets/,
  );
  assert.deepEqual(memory.read(), before);
});
test("cloning into an unused destination still creates independent snippets", async () => {
  const memory = memoryStorage();
  const load = createLoader({
    "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
    "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
  });
  const storage = load("src/lib/storage.ts");
  await storage.saveInputSnippet("source", page, input, snippet("source"));
  assert.equal(
    await storage.cloneInputEntry(
      "source",
      "https://target.example",
      "/form",
      "Source",
    ),
    1,
  );
  const entry = await storage.getInputEntry(
    "https://target.example/form::Source::id:notes",
  );
  assert.equal(entry.snippets[0].value, "source");
  assert.notEqual(entry.snippets[0].id, "source");
  assert.equal((await storage.getTrackedInputs()).length, 1);
});
