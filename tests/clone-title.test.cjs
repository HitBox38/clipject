const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  memoryStorage,
  snippet,
  page,
  input,
} = require("./helpers/source.cjs");
for (const title of ["Destination title", "", "  Exact title  "]) {
  test(
    "clone resolves using the destination title: " + JSON.stringify(title),
    async () => {
      const memory = memoryStorage();
      const document = { title };
      const window = {
        location: { origin: "https://target.example", pathname: "/new" },
      };
      const load = createLoader(
        {
          "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
          "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
        },
        { document, window },
      );
      const storage = load("src/lib/storage.ts");
      const keys = load("src/lib/keys.ts");
      await storage.saveInputSnippet("source", page, input, snippet("source"));
      await storage.cloneInputEntry(
        "source",
        window.location.origin,
        "/new",
        title,
        "name:target",
      );
      const entry = await storage.getInputEntry(
        keys.buildCompositeKey(keys.computePageKey().key, "name:target"),
      );
      assert.equal(entry.page.titleLastSeen, title);
      assert.equal(entry.snippets[0].value, "source");
      assert.equal(
        (await storage.getInputEntry("source")).page.titleLastSeen,
        "Source",
      );
    },
  );
}
