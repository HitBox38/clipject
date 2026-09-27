// Run with CLIPJECT_TEST_BROWSER=/path/to/chrome node tests/paste-browser.cjs.
// Uses a fresh headless profile; never connects to an existing browser session.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

async function main() {
const executable = process.env.CLIPJECT_TEST_BROWSER;
assert.ok(executable, "Set CLIPJECT_TEST_BROWSER to a Chrome executable");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clipject-paste-"));
const { build } = await import("vite");
const bundle = await build({
  configFile: false,
  logLevel: "silent",
  resolve: { alias: { "@": path.resolve(__dirname, "../src") } },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "../src/lib/paste.ts"),
      name: "ClipjectPasteTest",
      formats: ["iife"],
    },
  },
});
const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
const code = output.find((entry) => entry.type === "chunk").code +
  "\nconst setNativeValue = ClipjectPasteTest.setNativeValue;";

const scenarios = () => {
  const results = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  for (const type of ["textarea", "text", "search", "tel", "url", "email", "number"]) {
    const field = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") field.type = type;
    const draft = type === "number" ? "123" : "Original draft";
    const snippet = type === "number" ? "456" : "Snippet text";
    field.value = draft;
    document.body.append(field);
    let inputs = 0;
    let changes = 0;
    field.addEventListener("input", () => inputs++);
    field.addEventListener("change", () => changes++);
    check(setNativeValue(field, snippet) === null, type + " insertion succeeds");
    check(field.value === snippet, type + " full replacement");
    check(inputs === 1 && changes === 1, type + " exactly one input/change");
    document.execCommand("undo");
    check(field.value === draft, type + " undo restores draft");
    document.execCommand("redo");
    check(field.value === snippet, type + " redo restores snippet");
    check(inputs === 3, type + " native undo/redo emit input");
    const second = type === "number" ? "789" : "Second snippet";
    check(setNativeValue(field, second) === null, type + " second insertion");
    document.execCommand("undo");
    check(field.value === snippet, type + " undo only the second insertion");
    document.execCommand("undo");
    check(field.value === draft, type + " undo both insertions");
    results.push(type + ": replace, events, undo, redo, repeated insert pass");
    field.remove();
  }
  for (const type of ["date", "time"]) {
    const field = document.createElement("input");
    field.type = type;
    field.value = type === "date" ? "2026-09-28" : "13:30";
    const original = field.value;
    document.body.append(field);
    check(typeof setNativeValue(field, "unsupported") === "string", type + " reports failure");
    check(field.value === original, type + " keeps original");
    results.push(type + ": preserves draft on unsupported editing command");
    field.remove();
  }
  const blocked = document.createElement("textarea");
  blocked.value = "Keep this draft";
  document.body.append(blocked);
  blocked.focus();
  blocked.setSelectionRange(2, 6);
  const originalCommand = document.execCommand;
  document.execCommand = () => false;
  check(typeof setNativeValue(blocked, "replacement") === "string", "reports rejected command");
  check(blocked.value === "Keep this draft", "rejected command keeps draft");
  check(blocked.selectionStart === 2 && blocked.selectionEnd === 6, "restores selection");
  document.execCommand = originalCommand;
  results.push("rejected command: draft and selection preserved");
  blocked.remove();
  return results;
};

try {
  const html = `<!doctype html><meta charset="utf-8"><pre id="results"></pre><script>
${code}
try {
  document.querySelector('#results').textContent = JSON.stringify({ok:true, results:(${scenarios})()});
} catch(error) {
  document.querySelector('#results').textContent = JSON.stringify({ok:false,error:String(error)});
}
</script>`;
  const fixture = path.join(dir, "test.html");
  fs.writeFileSync(fixture, html);
  const result = spawnSync(executable, [
    "--headless", "--disable-gpu", "--no-first-run", "--disable-background-networking",
    "--user-data-dir=" + path.join(dir, "profile"), "--dump-dom", "file://" + fixture,
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
