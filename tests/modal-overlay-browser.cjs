// CLIPJECT_TEST_BROWSER=/path/to/chrome node tests/modal-overlay-browser.cjs
// Real DOM/top-layer tests in a new headless profile, separate from user Chrome.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

async function main() {
  const executable = process.env.CLIPJECT_TEST_BROWSER;
  assert.ok(executable, "Set CLIPJECT_TEST_BROWSER to Chrome");
  const { build } = await import("vite");
  const bundle = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: path.resolve(__dirname, "../src/content/overlay-layer.ts"),
        name: "ClipjectOverlayTest",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
  const code = output.find((entry) => entry.type === "chunk").code;
  const scenarios = async () => {
    const { placeOverlay } = ClipjectOverlayTest;
    const results = [];
    const check = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const dialog = document.createElement("dialog");
    dialog.style.cssText = "width:120px;height:100px;overflow:hidden;transform:translate(30px,20px)";
    const field = document.createElement("textarea");
    dialog.append(field);
    document.body.append(dialog);
    dialog.showModal();
    field.focus();

    function overlayFor(target) {
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;background:transparent";
      const shadow = host.attachShadow({ mode: "open" });
      const button = document.createElement("button");
      button.textContent = "Insert snippet";
      button.style.cssText = "position:fixed;left:20px;top:20px;width:160px;height:40px;pointer-events:auto";
      shadow.append(button);
      let dismissed = 0;
      let dispose;
      dispose = placeOverlay(host, target, () => {
        dismissed++;
        dispose();
      });
      return { host, button, dispose, get dismissed() { return dismissed; } };
    }

    const picker = overlayFor(field);
    check(picker.host.parentElement === dialog, "host belongs to target modal");
    check(picker.host.matches(":popover-open"), "host is in top layer");
    const rect = picker.button.getBoundingClientRect();
    check(rect.left === 20 && rect.top === 20, "position uses viewport despite dialog transform");
    check(document.elementFromPoint(40, 40) === picker.host, "picker is hit-testable outside clipped dialog");
    picker.button.focus();
    check(picker.host.shadowRoot.activeElement === picker.button, "picker button is not inert");
    picker.button.addEventListener("click", () => { field.value = "Inserted"; });
    picker.button.click();
    check(field.value === "Inserted", "click reaches picker action");
    results.push("modal picker: top layer, viewport position, unclipped hit target, focus, action");

    dialog.close();
    await flush();
    check(picker.dismissed === 1 && !picker.host.isConnected, "dialog close removes picker exactly once");
    dialog.showModal();
    const second = overlayFor(field);
    field.remove();
    await flush();
    check(second.dismissed === 1 && !second.host.isConnected, "removed target cleans up picker");
    results.push("lifecycle: close, reopen, and removed target clean up overlays");
    dialog.close();
    dialog.remove();

    const ordinary = document.createElement("textarea");
    document.body.append(ordinary);
    const pagePicker = overlayFor(ordinary);
    check(pagePicker.host.parentElement === document.body, "ordinary field stays in body");
    check(document.elementFromPoint(40, 40) === pagePicker.host, "ordinary overlay hit testing still works");
    pagePicker.dispose();
    ordinary.remove();
    results.push("ordinary page field: correct host and hit target");
    return results;
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clipject-modal-"));
  try {
    const fixture = path.join(dir, "test.html");
    fs.writeFileSync(fixture, `<!doctype html><meta charset="utf-8"><pre id="results"></pre><script>
${code}
(async()=>{try {
  const results = await (${scenarios})();
  document.querySelector('#results').textContent = JSON.stringify({ok:true,results});
} catch(error) {
  document.querySelector('#results').textContent = JSON.stringify({ok:false,error:String(error)});
}})();
</script>`);
    const result = spawnSync(executable, [
      "--headless", "--disable-gpu", "--no-first-run", "--disable-background-networking",
      "--virtual-time-budget=1000", "--user-data-dir=" + path.join(dir, "profile"),
      "--dump-dom", "file://" + fixture,
    ], { encoding: "utf8", timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
    const match = result.stdout?.match(/<pre id="results">([^<]*)<\/pre>/);
    assert.ok(match, result.error?.message || result.stderr);
    const report = JSON.parse(match[1].replaceAll("&amp;", "&"));
    assert.equal(report.ok, true, report.error);
    console.log(report.results.join("\n"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
void main();
