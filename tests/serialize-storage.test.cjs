const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  memoryStorage,
  snippet,
  page,
  input,
} = require("./helpers/source.cjs");
function contexts() {
  const memory = memoryStorage();
  let listener;
  const runtime = {
    id: "clipject-test",
    onMessage: {
      addListener(fn) {
        listener = fn;
      },
    },
    sendMessage(message) {
      return new Promise((resolve, reject) => {
        try {
          listener(structuredClone(message), { id: runtime.id }, resolve);
        } catch (error) {
          reject(error);
        }
      });
    },
  };
  const mocks = {
    "src/lib/ext.ts": { ext: { storage: { local: memory.local }, runtime } },
  };
  createLoader(mocks)(
    "src/background/storage-mutations.ts",
  ).initStorageMutations();
  return {
    memory,
    clients: [
      createLoader(mocks)("src/lib/storage.ts"),
      createLoader(mocks)("src/lib/storage.ts"),
    ],
    runtime,
  };
}
test("simultaneous saves from separate contexts preserve both global snippets", async () => {
  const {
    clients: [a, b],
  } = contexts();
  await Promise.all([
    a.saveGlobalSnippet(snippet("a")),
    b.saveGlobalSnippet(snippet("b")),
  ]);
  assert.deepEqual(
    (await a.getGlobalSnippets()).map((s) => s.id),
    ["a", "b"],
  );
});
test("simultaneous saves preserve different fields and same-field snippets", async () => {
  const {
    clients: [a, b],
  } = contexts();
  await Promise.all([
    a.saveInputSnippet("A", page, input, snippet("a")),
    b.saveInputSnippet("B", page, input, snippet("b")),
  ]);
  assert.equal(Object.keys(await a.getPerInputDb()).length, 2);
  await Promise.all([
    a.saveInputSnippet("A", page, input, snippet("c")),
    b.saveInputSnippet("A", page, input, snippet("d")),
  ]);
  assert.deepEqual(
    (await a.getInputEntry("A")).snippets.map((s) => s.id),
    ["a", "c", "d"],
  );
});
test("rejected writes reach callers and do not block later writes", async () => {
  const {
    memory,
    clients: [a, b],
  } = contexts();
  memory.failWrites(true);
  await assert.rejects(a.saveGlobalSnippet(snippet("bad")), /QUOTA_BYTES/);
  memory.failWrites(false);
  await b.saveGlobalSnippet(snippet("good"));
  assert.deepEqual(
    (await a.getGlobalSnippets()).map((s) => s.id),
    ["good"],
  );
});
test("nested clone operations complete without deadlocking the queue", async () => {
  const {
    clients: [a],
  } = contexts();
  await a.saveInputSnippet("source", page, input, snippet("s"));
  assert.equal(
    await a.cloneInputEntry("source", "https://target.example", "/form"),
    1,
  );
  assert.equal((await a.getTrackedInputs()).length, 1);
});
test("concurrent tracking deduplicates a registration", async () => {
  const {
    clients: [a, b],
  } = contexts();
  const tracked = {
    origin: page.origin,
    pathname: page.pathname,
    inputSignature: input.signature,
    registeredAt: 1,
  };
  await Promise.all([a.addTrackedInput(tracked), b.addTrackedInput(tracked)]);
  assert.equal((await a.getTrackedInputs()).length, 1);
});
