import { beforeEach, describe, expect, test, vi } from "vitest";
import * as c from "@/lib/constants";
import { buildTrackingFingerprint } from "@/lib/keys";
import { input, page, payload, snippet } from "../helpers/data";
import { storageContexts } from "../helpers/extension";

describe("storage through the background writer", () => {
  let h: Awaited<ReturnType<typeof storageContexts>>;
  beforeEach(async () => {
    h = await storageContexts();
  });

  test("separate clients route simultaneous global saves through one writer", async () => {
    expect(h.a).not.toBe(h.b);
    await Promise.all([
      h.a.saveGlobalSnippet(snippet("a")),
      h.b.saveGlobalSnippet(snippet("b")),
    ]);
    expect((await h.a.getGlobalSnippets()).map((s) => s.id)).toEqual([
      "a",
      "b",
    ]);
    expect(h.api.runtime.sendMessage).toHaveBeenCalledTimes(2);
  });

  test("simultaneous saves preserve different fields and same-field snippets", async () => {
    await Promise.all([
      h.a.saveInputSnippet("A", page, input, snippet("a")),
      h.b.saveInputSnippet("B", page, input, snippet("b")),
    ]);
    expect(Object.keys(await h.a.getPerInputDb())).toHaveLength(2);
    await Promise.all([
      h.a.saveInputSnippet("A", page, input, snippet("c")),
      h.b.saveInputSnippet("A", page, input, snippet("d")),
    ]);
    expect((await h.a.getInputEntry("A"))?.snippets.map((s) => s.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  test("rejected writes reach callers and do not block later writes", async () => {
    h.failWrites(true);
    await expect(h.a.saveGlobalSnippet(snippet("bad"))).rejects.toThrow(
      "QUOTA_BYTES",
    );
    h.failWrites(false);
    await h.b.saveGlobalSnippet(snippet("good"));
    expect(await h.a.getGlobalSnippets()).toEqual([snippet("good")]);
  });

  test("nested clone operations complete without deadlocking the queue", async () => {
    await h.a.saveInputSnippet("source", page, input, snippet("s"));
    await expect(
      h.a.cloneInputEntry(
        "source",
        "https://target.example",
        "/form",
        "Target",
      ),
    ).resolves.toBe(1);
    expect(await h.a.getTrackedInputs()).toHaveLength(1);
  });

  test("concurrent tracking deduplicates registration", async () => {
    const tracked = {
      origin: page.origin,
      pathname: page.pathname,
      inputSignature: input.signature,
      registeredAt: 1,
    };
    await Promise.all([
      h.a.addTrackedInput(tracked),
      h.b.addTrackedInput(tracked),
    ]);
    expect(await h.a.getTrackedInputs()).toEqual([tracked]);
  });

  test("cloning rejects an occupied destination without changing data", async () => {
    await h.a.saveInputSnippet("source", page, input, snippet("source"));
    const key = "https://target.example/form::Source::id:notes";
    await h.a.saveInputSnippet(
      key,
      { ...page, origin: "https://target.example" },
      input,
      snippet("destination"),
    );
    const before = h.read();
    await expect(
      h.a.cloneInputEntry(
        "source",
        "https://target.example",
        "/form",
        "Source",
      ),
    ).rejects.toThrow("destination already has snippets");
    expect(h.read()).toEqual(before);
  });

  test.each(["Destination title", "", "  Exact title  "])(
    "clone keeps the exact destination title %j across contexts",
    async (title) => {
      await h.a.saveInputSnippet("source", page, input, snippet("source"));
      await h.a.cloneInputEntry(
        "source",
        "https://target.example",
        "/new",
        title,
        "name:target",
      );
      expect(h.api.runtime.sendMessage).toHaveBeenLastCalledWith({
        type: "CLIPJECT_STORAGE_MUTATION",
        operation: "cloneInputEntry",
        args: [
          "source",
          "https://target.example",
          "/new",
          title,
          "name:target",
        ],
      });
      const entry = await h.b.getInputEntry(
        `https://target.example/new::${title}::name:target`,
      );
      expect(entry?.page.titleLastSeen).toBe(title);
      expect(entry?.snippets[0].value).toBe("source");
      expect(entry?.snippets[0].id).not.toBe("source");
      expect((await h.a.getInputEntry("source"))?.page.titleLastSeen).toBe(
        "Source",
      );
      expect(await h.a.getTrackedInputs()).toHaveLength(1);
    },
  );

  test("missing clone source fails without writing", async () => {
    await expect(
      h.a.cloneInputEntry("missing", page.origin, page.pathname, "Target"),
    ).rejects.toThrow("not found");
    expect(h.api.storage.local.set).not.toHaveBeenCalled();
  });

  test("rejected replacement preserves all existing data", async () => {
    await h.a.saveGlobalSnippet(snippet("old"));
    await h.a.saveInputSnippet("old", page, input, snippet("old"));
    const before = h.read();
    h.failWrites(true);
    await expect(
      h.a.importAllData(
        payload({ globalSnippets: [snippet("new")] }),
        "replace",
      ),
    ).rejects.toThrow("QUOTA_BYTES");
    expect(h.read()).toEqual(before);
    expect(h.api.storage.local.remove).not.toHaveBeenCalled();
  });

  test("replacement clears old collections in one write and keeps preferences", async () => {
    h.seed({
      [c.STORAGE_KEY_GLOBAL_SNIPPETS]: [snippet("old")],
      [c.STORAGE_KEY_PER_INPUT_DB]: {
        old: { page, input, snippets: [snippet("old")] },
      },
      [c.STORAGE_KEY_TRACKED_INPUTS]: [
        {
          origin: page.origin,
          pathname: page.pathname,
          inputSignature: input.signature,
          registeredAt: 1,
        },
      ],
      [c.STORAGE_KEY_THEME]: "dark",
    });
    await h.a.importAllData(payload(), "replace");
    expect(h.api.storage.local.set).toHaveBeenCalledTimes(1);
    expect(h.read()).toEqual({
      [c.STORAGE_KEY_GLOBAL_SNIPPETS]: [],
      [c.STORAGE_KEY_PER_INPUT_DB]: {},
      [c.STORAGE_KEY_TRACKED_INPUTS]: [],
      [c.STORAGE_KEY_THEME]: "dark",
    });
  });

  test("merge preserves existing snippets and skips existing IDs", async () => {
    await h.a.saveGlobalSnippet(snippet("old"));
    await h.a.saveInputSnippet("field", page, input, snippet("old"));
    await h.a.importAllData(
      payload({
        globalSnippets: [snippet("old", "replacement"), snippet("new")],
        perInputDb: {
          field: {
            page: { ...page, titleLastSeen: "New title" },
            input: { ...input, lastSeenAt: 2 },
            snippets: [snippet("old", "replacement"), snippet("new")],
          },
          other: { page, input, snippets: [snippet("other")] },
        },
        trackedInputs: [1, 2].map((registeredAt) => ({
          origin: page.origin,
          pathname: page.pathname,
          inputSignature: input.signature,
          registeredAt,
        })),
      }),
      "merge",
    );
    expect(await h.a.getGlobalSnippets()).toEqual([
      snippet("old"),
      snippet("new"),
    ]);
    expect((await h.a.getInputEntry("field"))?.snippets).toEqual([
      snippet("old"),
      snippet("new"),
    ]);
    expect((await h.a.getInputEntry("field"))?.page.titleLastSeen).toBe(
      "New title",
    );
    expect((await h.a.getInputEntry("other"))?.snippets).toEqual([
      snippet("other"),
    ]);
    expect(await h.a.getTrackedInputs()).toHaveLength(1);
  });

  test("edit and deletion round trip through clients; last snippet removes its entry", async () => {
    await h.a.saveGlobalSnippet({ ...snippet("g"), label: "Old" });
    await h.a.saveInputSnippet("field", page, input, {
      ...snippet("i"),
      label: "Old",
    });
    vi.spyOn(Date, "now").mockReturnValue(42);
    await h.b.updateGlobalSnippet("g", { label: "", value: "Edited" });
    await h.b.updateInputSnippet("field", "i", { label: "", value: "Edited" });
    expect((await h.a.getGlobalSnippets())[0]).toMatchObject({
      label: "",
      value: "Edited",
      updatedAt: 42,
    });
    expect((await h.a.getInputEntry("field"))?.snippets[0]).toMatchObject({
      label: "",
      value: "Edited",
      updatedAt: 42,
    });
    await h.b.deleteGlobalSnippet("g");
    await h.b.deleteInputSnippet("field", "i");
    expect(await h.a.getGlobalSnippets()).toEqual([]);
    expect(await h.a.getInputEntry("field")).toBeNull();
  });

  test("missing edits and deletes are harmless", async () => {
    await h.a.updateGlobalSnippet("missing", {});
    await h.a.updateInputSnippet("missing", "missing", {});
    await h.a.deleteInputSnippet("missing", "missing");
    await h.a.saveInputSnippet("field", page, input, snippet("i"));
    await h.a.updateInputSnippet("field", "missing", {});
    await h.a.updateInputSnippet("field", "i", {});
    await h.a.deleteInputEntry("field");
    expect(await h.a.getPerInputDb()).toEqual({});
  });

  test("tracking includes legacy entries and removing registration preserves their discovery", async () => {
    const fp = buildTrackingFingerprint(
      page.origin,
      page.pathname,
      input.signature,
    );
    await h.a.addTrackedInput({
      origin: page.origin,
      pathname: page.pathname,
      inputSignature: input.signature,
      registeredAt: 1,
    });
    await h.a.saveInputSnippet("field", page, input, snippet("s"));
    expect(await h.a.buildTrackedFingerprintSet()).toEqual(new Set([fp]));
    await h.a.removeTrackedInput(fp);
    expect(await h.a.getTrackedInputs()).toEqual([]);
    expect(await h.a.buildTrackedFingerprintSet()).toEqual(new Set([fp]));
  });

  test("export and clear remove all snippet data and keep settings", async () => {
    expect(await h.a.getEnabled()).toBe(true);
    expect(await h.a.getTheme()).toBe("system");
    await h.a.setEnabled(false);
    await h.a.setTheme("dark");
    await h.a.saveGlobalSnippet(snippet("g"));
    await h.a.saveInputSnippet("field", page, input, snippet("i"));
    const exported = await h.a.exportAllData();
    expect(exported).toMatchObject({
      source: "clipject",
      version: 1,
      data: { globalSnippets: [snippet("g")] },
    });
    await h.a.clearAllData();
    expect((await h.a.exportAllData()).data).toEqual(payload().data);
    expect(await h.a.getEnabled()).toBe(false);
    expect(await h.a.getTheme()).toBe("dark");
  });

  test("storage events carry independent values and failed writes emit nothing", async () => {
    const listener = vi.fn();
    h.api.storage.onChanged.addListener(listener);
    await h.a.saveGlobalSnippet(snippet("g"));
    expect(listener).toHaveBeenCalledWith(
      {
        [c.STORAGE_KEY_GLOBAL_SNIPPETS]: {
          oldValue: undefined,
          newValue: [snippet("g")],
        },
      },
      "local",
    );
    h.failWrites(true);
    await expect(h.a.saveGlobalSnippet(snippet("bad"))).rejects.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("worker rejects foreign senders and unsupported operations", async () => {
    const respond = vi.fn();
    const listener = [...h.api.runtime.onMessage.listeners][0];
    listener(
      {
        type: "CLIPJECT_STORAGE_MUTATION",
        operation: "clearAllData",
        args: [],
      },
      { id: "foreign" },
      respond,
    );
    listener(
      { type: "CLIPJECT_STORAGE_MUTATION", operation: "unknown", args: [] },
      { id: h.api.runtime.id },
      respond,
    );
    expect(h.api.storage.local.remove).not.toHaveBeenCalled();
  });
});
