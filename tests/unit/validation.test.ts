import { expect, test } from "vitest";
import { validateExportPayload } from "@/lib/import-validation";
import { input, page, payload, snippet } from "../helpers/data";
import { storageContexts, extensionHarness } from "../helpers/extension";

// Malformed external data deliberately stays unknown instead of lying to TS.
const shareCode = (raw: unknown) =>
  `clipject:share:v1:${Buffer.from(JSON.stringify(raw)).toString("base64url")}`;
const shared = {
  type: "per-input-snippet",
  page,
  input,
  snippet: snippet("s"),
};

async function sharing() {
  extensionHarness();
  return import("@/lib/sharing");
}

test.each([123, {}, [], null, true])(
  "invalid optional label %j cannot reach preview or storage",
  async (label) => {
    const { decodeShareString } = await sharing();
    expect(
      decodeShareString(
        shareCode({ ...shared, snippet: { ...snippet("s"), label } }),
      ).ok,
    ).toBe(false);
    expect(validateExportPayload(payload({ globalSnippets: [] })).ok).toBe(
      true,
    );
    expect(
      validateExportPayload({
        ...payload(),
        data: {
          ...payload().data,
          globalSnippets: [{ ...snippet("s"), label }],
        },
      }).ok,
    ).toBe(false);
  },
);

test.each([undefined, "", "Greeting", "שלום 👋"])(
  "valid optional label %j round trips",
  async (label) => {
    const { encodeShareString, decodeShareString } = await sharing();
    const data = {
      ...shared,
      type: "per-input-snippet" as const,
      snippet: { ...snippet("s", "שלום 👋\n  café"), label },
    };
    expect(decodeShareString(encodeShareString(data))).toEqual({
      ok: true,
      payload: data,
    });
  },
);

test("optional input type must be a string", async () => {
  const { decodeShareString } = await sharing();
  expect(
    decodeShareString(shareCode({ ...shared, input: { ...input, type: {} } }))
      .ok,
  ).toBe(false);
  expect(
    decodeShareString(
      shareCode({ ...shared, input: { ...input, type: "text" } }),
    ).ok,
  ).toBe(true);
});

test.each([
  "unrelated",
  "clipject:share:v2:abc",
  "clipject:share:v1:",
  "clipject:share:v1:%%%",
  `clipject:share:v1:${Buffer.from("not json").toString("base64url")}`,
])("rejects malformed share envelope %s", async (code) => {
  const { decodeShareString } = await sharing();
  expect(decodeShareString(code).ok).toBe(false);
});

const malformedShares: unknown[] = [
  null,
  [],
  { ...shared, type: "other" },
  ...[
    null,
    { ...page, origin: 3 },
    { ...page, pathname: false },
    { ...page, titleLastSeen: [] },
  ].map((page) => ({ ...shared, page })),
  ...[
    null,
    { ...input, signature: 2 },
    { ...input, tag: "div" },
    { ...input, lastSeenAt: null },
  ].map((input) => ({ ...shared, input })),
  ...[
    null,
    { ...snippet("s"), id: 2 },
    { ...snippet("s"), value: [] },
    { ...snippet("s"), createdAt: null },
    { ...snippet("s"), updatedAt: null },
  ].map((snippet) => ({ ...shared, snippet })),
];
test.each(malformedShares.map((raw, index) => ({ raw, index })))(
  "rejects malformed share payload $index",
  async ({ raw }) => {
    const { decodeShareString } = await sharing();
    expect(decodeShareString(shareCode(raw)).ok).toBe(false);
  },
);

const valid = payload({
  globalSnippets: [snippet("g")],
  perInputDb: { field: { page, input, snippets: [snippet("i")] } },
  trackedInputs: [
    {
      origin: page.origin,
      pathname: page.pathname,
      inputSignature: input.signature,
      registeredAt: 1,
    },
  ],
});
const malformedExports: unknown[] = [
  null,
  [],
  { ...valid, source: "other" },
  { ...valid, version: 2 },
  { ...valid, exportedAt: Infinity },
  { ...valid, data: null },
  ...[
    null,
    {},
    [null],
    [{ ...snippet("g"), id: 1 }],
    [{ ...snippet("g"), value: null }],
    [{ ...snippet("g"), createdAt: NaN }],
    [{ ...snippet("g"), updatedAt: Infinity }],
  ].map((globalSnippets) => ({
    ...valid,
    data: { ...valid.data, globalSnippets },
  })),
  ...[
    null,
    [],
    { field: null },
    ...[
      ...[
        null,
        { ...page, origin: 1 },
        { ...page, pathname: null },
        { ...page, titleLastSeen: true },
      ].map((page) => ({ page, input, snippets: [] })),
      ...[
        null,
        { ...input, signature: 1 },
        { ...input, tag: "div" },
        { ...input, lastSeenAt: NaN },
        { ...input, type: 1 },
      ].map((input) => ({ page, input, snippets: [] })),
      { page, input, snippets: null },
      { page, input, snippets: [null] },
    ].map((entry) => ({ field: entry })),
  ].map((perInputDb) => ({ ...valid, data: { ...valid.data, perInputDb } })),
  ...[
    null,
    [null],
    ...[
      { origin: 1 },
      { pathname: null },
      { inputSignature: [] },
      { registeredAt: Infinity },
    ].map((patch) => [{ ...valid.data.trackedInputs[0], ...patch }]),
  ].map((trackedInputs) => ({
    ...valid,
    data: { ...valid.data, trackedInputs },
  })),
];
test.each(malformedExports.map((raw, index) => ({ raw, index })))(
  "rejects malformed export $index without mutating it",
  ({ raw }) => {
    const before = structuredClone(raw);
    expect(validateExportPayload(raw).ok).toBe(false);
    expect(raw).toEqual(before);
  },
);

test("valid export including empty collections is accepted", () => {
  expect(validateExportPayload(valid)).toEqual({ ok: true, payload: valid });
  expect(validateExportPayload(payload())).toEqual({
    ok: true,
    payload: payload(),
  });
});

test("shared import creates independent IDs in the correct page and field", async () => {
  const h = await storageContexts();
  const { importSharedSnippet } = await import("@/lib/sharing");
  const data = { ...shared, type: "per-input-snippet" as const };
  await importSharedSnippet(data);
  await importSharedSnippet(data);
  const entry = await h.a.getInputEntry(
    `${page.origin}${page.pathname}::${page.titleLastSeen}::${input.signature}`,
  );
  expect(entry?.snippets).toHaveLength(2);
  expect(new Set(entry?.snippets.map((s) => s.id)).size).toBe(2);
  expect(entry?.snippets.every((s) => s.id !== "s" && s.value === "s")).toBe(
    true,
  );
});
