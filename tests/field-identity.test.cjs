const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  memoryStorage,
  snippet,
  page,
  input,
} = require("./helpers/source.cjs");

function fixture() {
  const fields = [];
  const listeners = new Map();
  const observers = [];
  const timers = new Map();
  const tracked = new Set();
  let timerId = 0;
  let picker = null;
  class Element {
    constructor(tag, attrs = {}, parent = null) {
      this.tagName = tag.toUpperCase();
      this.attrs = attrs;
      this.parentElement = parent;
      this.children = [];
      parent?.children.push(this);
    }
    matches(selector) {
      assert.equal(selector, ":disabled");
      return false;
    }
    closest(selector) {
      assert.equal(selector, "[inert]");
      return null;
    }
    getAttribute(key) {
      return this.attrs[key] ?? null;
    }
    get isConnected() {
      return this === document.body || !!this.parentElement?.isConnected;
    }
    get value() {
      assert.fail("Computing identity must not read field values");
    }
  }
  class Input extends Element {
    constructor(attrs, parent) {
      super("input", attrs, parent);
      this.type = "text";
      fields.push(this);
    }
  }
  class Textarea extends Element {}
  const document = {
    title: "QA",
    activeElement: null,
    head: null,
    body: new Element("body"),
    querySelector: () => null,
    querySelectorAll(selector) {
      assert.equal(selector, "input, textarea");
      return fields.filter((field) => field.isConnected);
    },
    getElementById: () => null,
    addEventListener: (name, fn) => listeners.set(name, fn),
  };
  const globals = {
    document,
    window: {
      location: { origin: "https://test.example", pathname: "/form" },
      addEventListener() {},
    },
    HTMLElement: Element,
    HTMLInputElement: Input,
    HTMLTextAreaElement: Textarea,
    MutationObserver: class {
      constructor(fn) {
        this.fn = fn;
      }
      observe(target) {
        if (target === document.body) observers.push(this.fn);
      }
    },
    setTimeout(fn) {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  const load = createLoader({
    "@/lib/storage": {
      getEnabled: async () => true,
      buildTrackedFingerprintSet: async () => tracked,
    },
    "@/lib/ext": {
      ext: {
        storage: { onChanged: { addListener() {} } },
        runtime: { onMessage: { addListener() {} } },
      },
    },
    "./mount": {
      mountPicker: (props) => {
        picker = props;
      },
      unmountPicker: () => {
        picker = null;
      },
    },
    "./element-selector": {
      isElementSelectorActive: () => false,
      startElementSelector() {},
    },
  }, globals);
  const keys = load("src/lib/keys.ts");
  const signature = keys.computeInputSignature;
  return {
    signature,
    keys,
    globals,
    field: (attrs = {}, parent = document.body) => new Input(attrs, parent),
    group: () => new Element("form", {}, document.body),
    track(signature) {
      tracked.add(keys.buildTrackingFingerprint(
        "https://test.example", "/form", signature,
      ));
    },
    async observe() {
      load("src/content/observer.ts").initObserver();
      await Promise.resolve();
    },
    mutate: () => observers.forEach((fn) => fn()),
    focus(field) {
      document.activeElement = field;
      listeners.get("focusin")({ target: field });
      for (const [id, fn] of [...timers]) {
        timers.delete(id);
        fn();
      }
    },
    get picker() {
      return picker;
    },
  };
}

for (const [attrs, expected] of [
  [{ id: "notes", name: "shared" }, "id:notes"],
  [{ name: "notes" }, "name:notes"],
  [{ "aria-label": "Notes" }, "aria:Notes"],
  [{ placeholder: "Notes" }, "ph:Notes"],
]) {
  test("unique attribute retains legacy key " + expected, () => {
    const f = fixture();
    const field = f.field(attrs);
    f.field({ name: "shared" });
    assert.equal(f.signature(field), expected);
    // An unrelated field inserted before the form cannot change a unique ID.
    f.group();
    assert.equal(f.signature(field), expected);
  });
}

test("same name with different placeholders yields independent signatures", () => {
  const f = fixture();
  const first = f.field({ name: "same", placeholder: "First" });
  const second = f.field({ name: "same", placeholder: "Second" });
  assert.equal(f.signature(first), "ph:First");
  assert.equal(f.signature(second), "ph:Second");
});

test("duplicate IDs continue through stable unique labels", () => {
  const f = fixture();
  const first = f.field({ id: "same", name: "same", "aria-label": "First" });
  const second = f.field({ id: "same", name: "same", "aria-label": "Second" });
  assert.equal(f.signature(first), "aria:First");
  assert.equal(f.signature(second), "aria:Second");
});

test("identical attributes fall back to distinct DOM paths", () => {
  const f = fixture();
  const attrs = {
    id: "same", name: "same", "aria-label": "same", placeholder: "same",
  };
  const first = f.field(attrs, f.group());
  const second = f.field(attrs, f.group());
  assert.equal(f.signature(first), "path:form:nth-of-type(1) > input");
  assert.equal(f.signature(second), "path:form:nth-of-type(2) > input");
});

test("attribute values containing selector syntax are compared literally", () => {
  const f = fixture();
  const first = f.field({ name: 'a"] :not(input)', placeholder: "First" });
  f.field({ name: 'a"] :not(input)', placeholder: "Second" });
  assert.equal(f.signature(first), "ph:First");
});

test("ambiguous legacy snippets remain in storage without appearing on either field", async () => {
  const f = fixture();
  const memory = memoryStorage();
  const storage = createLoader({
    "src/lib/storage-messaging.ts": { isStorageWriter: () => true },
    "src/lib/ext.ts": { ext: { storage: { local: memory.local } } },
  })("src/lib/storage.ts");
  const pageKey = f.keys.computePageKey().key;
  const legacyKey = f.keys.buildCompositeKey(pageKey, "name:same");
  await storage.saveInputSnippet(legacyKey, page, input, snippet("legacy"));
  const before = memory.read();
  const first = f.field({ name: "same", placeholder: "First" });
  const second = f.field({ name: "same", placeholder: "Second" });
  f.track("name:same");
  await f.observe();
  for (const field of [first, second]) {
    f.focus(field);
    assert.equal(f.picker, null);
    assert.equal(await storage.getInputEntry(
      f.keys.buildCompositeKey(pageKey, f.signature(field)),
    ), null);
  }
  assert.deepEqual(memory.read(), before);
  assert.equal((await storage.getInputEntry(legacyKey)).snippets[0].id, "legacy");
  // Explicitly selecting the first new identity must not enable the second.
  f.track(f.signature(first));
  f.focus(first);
  assert.ok(f.picker);
  f.focus(second);
  assert.equal(f.picker, null);
});

test("adding a duplicate closes a picker using its now-ambiguous legacy key", async () => {
  const f = fixture();
  const first = f.field({ name: "same", placeholder: "First" });
  f.track("name:same");
  await f.observe();
  f.focus(first);
  assert.ok(f.picker);
  const second = f.field({ name: "same", placeholder: "Second" });
  f.mutate();
  assert.equal(f.picker, null);
  f.focus(second);
  assert.equal(f.picker, null);
  f.focus(first);
  assert.equal(f.picker, null);
});

test("identity attribute changes close an old picker, unrelated DOM changes do not", async () => {
  const f = fixture();
  const first = f.field({ id: "first" });
  const second = f.field({ id: "second" });
  f.track("id:first");
  await f.observe();
  f.focus(first);
  f.group();
  f.mutate();
  assert.ok(f.picker);
  second.attrs.id = "first";
  f.mutate();
  assert.equal(f.picker, null);
});
