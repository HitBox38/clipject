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

test("clone forwards the exact destination title across extension contexts", async () => {
  let request;
  const load = createLoader({
    "src/lib/storage-messaging.ts": {
      isStorageWriter: () => false,
      requestStorageMutation: async (operation, args) => {
        request = { operation, args };
        return 1;
      },
    },
  });
  await load("src/lib/storage.ts").cloneInputEntry(
    "source",
    "https://target.example",
    "/form",
    "Exact destination title",
    "id:notes",
  );
  assert.deepEqual(request, {
    operation: "cloneInputEntry",
    args: [
      "source",
      "https://target.example",
      "/form",
      "Exact destination title",
      "id:notes",
    ],
  });
});
