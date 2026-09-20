const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./helpers/source.cjs");
test("banner Cancel click reaches its handler while page clicks remain blocked", () => {
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.style = {};
      this.handlers = new Map();
    }
    appendChild(child) {
      child.parent = this;
      this.children.push(child);
    }
    contains(target) {
      return target === this || this.children.some((c) => c.contains(target));
    }
    addEventListener(type, fn) {
      this.handlers.set(type, fn);
    }
    remove() {
      this.parent.children = this.parent.children.filter((c) => c !== this);
    }
  }
  const listeners = new Map();
  const document = {
    body: new Element("body"),
    createElement: (tag) => new Element(tag),
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
  };
  const load = createLoader(
    {
      "@/lib/keys": {
        isSupportedField: () => false,
        isPasswordField: () => false,
      },
      "@/lib/storage": {},
    },
    { document, HTMLElement: Element },
  );
  const selector = load("src/content/element-selector.ts");
  selector.startElementSelector();
  function click(target) {
    const event = {
      target,
      prevented: false,
      stopped: false,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
    };
    listeners.get("click")?.(event);
    if (!event.stopped) target.handlers.get("click")?.(event);
    return event;
  }
  assert.equal(click(new Element("a")).prevented, true);
  assert.equal(selector.isElementSelectorActive(), true);
  const cancel = document.body.children[0].children[1];
  click(cancel);
  assert.equal(selector.isElementSelectorActive(), false);
  assert.equal(document.body.children.length, 0);
  assert.equal(listeners.size, 0);
});
