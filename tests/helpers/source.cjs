const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Compile the real source with the project's existing TypeScript dependency.
// A fresh loader represents a separate extension context/module cache.
exports.createLoader = (mocks = {}, globals = {}) => {
  const root = path.resolve(__dirname, "../..");
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(root, relative);
    const key = path.relative(root, file).replaceAll("\\", "/");
    if (Object.hasOwn(mocks, key)) return mocks[key];
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: file,
    }).outputText;
    function resolve(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        return require(specifier);
      }
      const base = specifier.startsWith("@/")
        ? path.join(root, "src", specifier.slice(2))
        : path.resolve(path.dirname(file), specifier);
      const resolved = [
        base + ".ts",
        base + ".tsx",
        path.join(base, "index.tsx"),
      ].find((candidate) => fs.existsSync(candidate));
      if (!resolved) throw new Error("Cannot resolve " + specifier);
      return load(resolved);
    }
    new Function("require", "module", "exports", ...Object.keys(globals), code)(
      resolve,
      module,
      module.exports,
      ...Object.values(globals),
    );
    return module.exports;
  }
  return load;
};

exports.memoryStorage = () => {
  let data = {};
  let fail = false;
  const calls = [];
  const local = {
    async get(key) {
      return structuredClone({ [key]: data[key] });
    },
    async set(values) {
      calls.push({ type: "set", values: structuredClone(values) });
      if (fail) throw new Error("QUOTA_BYTES");
      Object.assign(data, structuredClone(values));
    },
    async remove(keys) {
      calls.push({ type: "remove", keys });
      for (const key of keys) delete data[key];
    },
  };
  return {
    local,
    calls,
    seed(value) {
      data = structuredClone(value);
    },
    read() {
      return structuredClone(data);
    },
    failWrites(value) {
      fail = value;
    },
  };
};
exports.snippet = (id, value = id) => ({
  id,
  value,
  createdAt: 1,
  updatedAt: 1,
});
exports.page = {
  origin: "https://source.example",
  pathname: "/form",
  titleLastSeen: "Source",
};
exports.input = { signature: "id:notes", tag: "textarea", lastSeenAt: 1 };
