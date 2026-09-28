import { beforeEach, expect, test, vi } from "vitest";
import { input, page, payload, snippet } from "../helpers/data";
import { storageContexts } from "../helpers/extension";

let h: Awaited<ReturnType<typeof storageContexts>>;
beforeEach(async () => {
  h = await storageContexts();
});

test("options store refreshes after mutations and failed writes retain existing UI data", async () => {
  const { useOptionsStore: store } =
    await import("@/options/stores/options-store");
  expect(store.getState().loaded).toBe(false);
  await store.getState().addGlobalSnippet("Hello", "Greeting");
  expect(store.getState().loaded).toBe(true);
  const id = store.getState().globalSnippets[0].id;
  await store.getState().editGlobalSnippet(id, { value: "Edited", label: "" });
  expect(store.getState().globalSnippets[0]).toMatchObject({
    value: "Edited",
    label: "",
  });
  h.failWrites(true);
  await expect(store.getState().removeGlobalSnippet(id)).rejects.toThrow(
    "QUOTA_BYTES",
  );
  expect(store.getState().globalSnippets).toHaveLength(1);
  h.failWrites(false);
  await store.getState().removeGlobalSnippet(id);
  expect(store.getState().globalSnippets).toEqual([]);
});

test("options field editing, import, clone and deletion keep selection consistent", async () => {
  const { useOptionsStore: store } =
    await import("@/options/stores/options-store");
  await store.getState().importData(
    payload({
      perInputDb: {
        source: { page, input, snippets: [snippet("a"), snippet("b")] },
      },
    }),
    "replace",
  );
  store.getState().selectEntry("source");
  await store.getState().editInputSnippet("source", "a", { value: "Edited" });
  expect(store.getState().perInputDb.source.snippets[0].value).toBe("Edited");
  await store.getState().removeInputSnippet("source", "b");
  await store
    .getState()
    .cloneEntry("source", "https://target.example", "/form", "Target");
  expect(Object.keys(store.getState().perInputDb)).toHaveLength(2);
  await store
    .getState()
    .removeInputEntry("https://target.example/form::Target::id:notes");
  expect(store.getState().selectedEntryKey).toBe("source");
  await store.getState().removeInputEntry("source");
  expect(store.getState().selectedEntryKey).toBeNull();
  await store.getState().clearAll();
  expect(store.getState().perInputDb).toEqual({});
});

test("popup stats load persisted data and toggling is visible to other clients", async () => {
  await h.a.saveGlobalSnippet(snippet("g"));
  await h.a.saveInputSnippet("field", page, input, snippet("i"));
  await h.a.addTrackedInput({
    origin: page.origin,
    pathname: page.pathname,
    inputSignature: input.signature,
    registeredAt: 1,
  });
  const { usePopupStore: store } = await import("@/popup/stores/popup-store");
  await store.getState().loadStats();
  expect(store.getState()).toMatchObject({
    loaded: true,
    globalCount: 1,
    inputCount: 1,
    trackedCount: 1,
    enabled: true,
  });
  await store.getState().toggleEnabled();
  expect(await h.b.getEnabled()).toBe(false);
  h.failWrites(true);
  await expect(store.getState().toggleEnabled()).rejects.toThrow();
  expect(store.getState().enabled).toBe(false);
});

test("extension wrapper prefers browser and falls back to chrome", async () => {
  const browser = { storage: {} };
  vi.resetModules();
  vi.stubGlobal("browser", browser);
  expect((await import("@/lib/ext")).ext).toBe(browser);
  vi.resetModules();
  vi.stubGlobal("browser", undefined);
  expect((await import("@/lib/ext")).ext).toBe(h.api);
});

test("a missing worker response rejects instead of reporting success", async () => {
  h.api.runtime.sendMessage.mockResolvedValueOnce(undefined);
  await expect(h.a.clearAllData()).rejects.toThrow(
    "The storage worker did not respond",
  );
  expect(h.api.storage.local.remove).not.toHaveBeenCalled();
});
