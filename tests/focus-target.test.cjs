const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./helpers/source.cjs");
function fixture() {
  class Element {
    constructor(id, tracked = true) {
      this.id = id;
      this.tracked = tracked;
      this.type = "text";
    }
  }
  const listeners = new Map();
  const timers = new Map();
  let id = 0;
  let picker = null;
  const document = {
    activeElement: null,
    head: null,
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
  };
  const load = createLoader(
    {
      "@/lib/keys": {
        isSupportedField: (el) =>
          el instanceof Element && el.type !== "password",
        isPasswordField: (el) => el.type === "password",
        computeInputSignature: (el) => el.id,
        buildTrackingFingerprint: (o, p, s) => s,
        computePageKey: () => ({ key: "page", meta: {} }),
        buildCompositeKey: (p, s) => p + s,
        buildInputMeta: () => ({}),
      },
      "@/lib/storage": {
        getEnabled: async () => true,
        buildTrackedFingerprintSet: async () => new Set(["a", "b"]),
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
    },
    {
      document,
      window: {
        location: { origin: "o", pathname: "p" },
        addEventListener() {},
      },
      HTMLElement: Element,
      MutationObserver: class {},
      setTimeout: (fn) => {
        timers.set(++id, fn);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  load("src/content/observer.ts").initObserver();
  function focus(el) {
    const old = document.activeElement;
    document.activeElement = el;
    if (old) listeners.get("focusout")({ target: old, relatedTarget: el });
    listeners.get("focusin")({ target: el });
  }
  function flush() {
    for (const [id, fn] of [...timers]) {
      timers.delete(id);
      fn();
    }
  }
  return {
    Element,
    document,
    focus,
    flush,
    get picker() {
      return picker;
    },
  };
}
test("tabbing from a tracked field to an untracked field closes the old picker", async () => {
  const f = fixture();
  await Promise.resolve();
  const a = new f.Element("a");
  f.focus(a);
  f.flush();
  assert.equal(f.picker.inputEl, a);
  f.focus(new f.Element("untracked"));
  assert.equal(f.picker, null);
  f.flush();
  assert.equal(f.picker, null);
});
test("switching tracked fields drops the previous target before debounce", async () => {
  const f = fixture();
  await Promise.resolve();
  const a = new f.Element("a"),
    b = new f.Element("b");
  f.focus(a);
  f.flush();
  f.focus(b);
  assert.equal(f.picker, null);
  f.flush();
  assert.equal(f.picker.inputEl, b);
});
test("a stale focus timer never opens a picker on a nonfocused field", async () => {
  const f = fixture();
  await Promise.resolve();
  f.focus(new f.Element("a"));
  f.document.activeElement = null;
  f.flush();
  assert.equal(f.picker, null);
});
