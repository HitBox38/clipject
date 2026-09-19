const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader, snippet, page, input } = require("./helpers/source.cjs");
const load = createLoader({ "src/lib/storage.ts": {} });
const { encodeShareString, decodeShareString } = load("src/lib/sharing.ts");
const decode = (s, i = input) =>
  decodeShareString(
    encodeShareString({
      type: "per-input-snippet",
      page,
      input: i,
      snippet: s,
    }),
  );
test("invalid optional labels cannot reach preview or storage", () => {
  for (const label of [123, {}, [], null, true])
    assert.equal(decode({ ...snippet("s"), label }).ok, false);
});
test("valid optional labels remain compatible", () => {
  for (const label of [undefined, "", "Greeting", "שלום 👋"])
    assert.equal(decode({ ...snippet("s"), label }).ok, true);
});
test("optional input type must be a string", () => {
  assert.equal(decode(snippet("s"), { ...input, type: {} }).ok, false);
  assert.equal(decode(snippet("s"), { ...input, type: "text" }).ok, true);
});
