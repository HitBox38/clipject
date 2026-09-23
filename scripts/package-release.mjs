import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json")));
const pkg = JSON.parse(await readFile(path.join(root, "package.json")));
assert.equal(pkg.version, manifest.version, "Package/manifest versions differ");
const release = path.join(root, "release", manifest.version);
await mkdir(release, { recursive: true });

async function filesAt(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) {
      result.push(...await filesAt(path.join(directory, entry.name), name + "/"));
    } else if (entry.isFile()) {
      result.push({ name, data: await readFile(path.join(directory, entry.name)) });
    } else {
      throw new Error(`Unexpected symbolic link: ${name}`);
    }
  }
  return result;
}

// A deterministic standard ZIP: sorted paths, UTF-8 names, fixed timestamps.
// No archiver executable or additional dependency is needed by AMO reviewers.
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return value >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    assert(!file.name.includes("\\") && !file.name.startsWith("/"));
    assert(!file.name.split("/").includes(".."));
    const name = Buffer.from(file.name);
    const compressed = deflateRawSync(file.data, { level: 9 });
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0x21, 12); // 1980-01-01
    header.writeUInt32LE(crc32(file.data), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(file.data.length, 22);
    header.writeUInt16LE(name.length, 26);
    const index = Buffer.alloc(46);
    index.writeUInt32LE(0x02014b50);
    index.writeUInt16LE(20, 4);
    header.copy(index, 6, 4, 30);
    index.writeUInt32LE(offset, 42);
    chunks.push(header, name, compressed);
    central.push(index, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}

async function validateBuild(directory, firefox) {
  // Exclude copied Vite scaffold graphics and duplicate public assets.
  const files = (await filesAt(directory)).filter(({ name }) =>
    name === "manifest.json" || name === "service-worker-loader.js" ||
    name === "THIRD-PARTY-LICENSES.txt" || name === "OUTFIT-OFL.txt" ||
    name.startsWith("assets/") || name.startsWith("src/") ||
    name.startsWith("public/icons/") || name.startsWith("icons/"));
  const names = new Set(files.map(({ name }) => name));
  const built = JSON.parse(files.find(({ name }) => name === "manifest.json").data);
  assert.equal(built.version, manifest.version);
  assert.equal(built.description, manifest.description);
  assert.equal(built.manifest_version, 3);
  assert(built.description.length <= 132);
  const refs = [
    built.action.default_popup, built.options_page,
    ...Object.values(built.icons), ...Object.values(built.action.default_icon),
    ...(built.background.scripts ?? [built.background.service_worker]),
    ...built.content_scripts.flatMap((script) => script.js),
    ...built.web_accessible_resources.flatMap((resource) => resource.resources),
  ];
  for (const ref of refs) assert(names.has(ref), `Missing package asset: ${ref}`);
  for (const [size, ref] of Object.entries(built.icons)) {
    const png = files.find(({ name }) => name === ref).data;
    assert.equal(png.readUInt32BE(16), Number(size));
    assert.equal(png.readUInt32BE(20), Number(size));
  }
  assert.deepEqual(built.permissions, ["storage", "activeTab", "scripting"]);
  if (firefox) {
    assert(!built.background.service_worker);
    assert(built.background.scripts.length > 0);
    assert.equal(built.browser_specific_settings.gecko.id,
      "clipject@tomer-norman.dev");
    assert.deepEqual(built.browser_specific_settings.gecko
      .data_collection_permissions.required, ["none"]);
    assert(built.web_accessible_resources.every((item) =>
      !("use_dynamic_url" in item)));
  } else {
    assert(built.background.service_worker);
    assert(!built.browser_specific_settings);
  }
  for (const { name, data } of files) {
    assert(!name.endsWith(".map"), `Source map in package: ${name}`);
    if (/\.(js|html)$/.test(name)) {
      assert(!/localhost:5173|@vite\/client|react-refresh/.test(data.toString()),
        `Development code in ${name}`);
    }
  }
  files.push({ name: "LICENSE", data: await readFile(path.join(root, "LICENSE")) });
  return files;
}

const archives = [];
for (const [browser, directory] of [["chrome", "dist"], ["firefox", "dist-firefox"]]) {
  const files = await validateBuild(path.join(root, directory), browser === "firefox");
  const name = `clipject-${manifest.version}-${browser}.zip`;
  await writeFile(path.join(release, name), zip(files));
  archives.push(name);
}

// Explicit allowlist: no personal data, credentials, workspace profiles, caches,
// agent instructions, .git, node_modules, or built output enters the source ZIP.
const source = [];
for (const name of ["src", "public", "scripts", "tests", "store", "package.json",
  "pnpm-lock.yaml", "pnpm-workspace.yaml", "manifest.json", "vite.config.ts",
  "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "eslint.config.js",
  "components.json", "index.html", "LICENSE", "README.md", "BUILDING.md",
  "CHROMEWEBSTORE.md", "FIREFOXADDONS.md", "PRIVACY.md", ".gitignore"]) {
  const location = path.join(root, name);
  if ((await stat(location)).isDirectory()) {
    source.push(...await filesAt(location, name + "/"));
  } else {
    source.push({ name, data: await readFile(location) });
  }
}
const sourceName = `clipject-${manifest.version}-source.zip`;
await writeFile(path.join(release, sourceName), zip(source));
archives.push(sourceName);
const sums = [];
for (const name of archives) {
  const data = await readFile(path.join(release, name));
  sums.push(`${createHash("sha256").update(data).digest("hex")}  ${name}`);
  console.log(`${name}: ${data.length.toLocaleString()} bytes`);
}
await writeFile(path.join(release, "SHA256SUMS.txt"), sums.join("\n") + "\n");
const kit = await filesAt(path.join(root, "store"), "store/");
for (const name of ["CHROMEWEBSTORE.md", "FIREFOXADDONS.md", "PRIVACY.md",
  "LICENSE", "BUILDING.md"]) {
  kit.push({ name, data: await readFile(path.join(root, name)) });
}
for (const name of [...archives, "SHA256SUMS.txt"]) {
  kit.push({ name: `release/${manifest.version}/${name}`,
    data: await readFile(path.join(release, name)) });
}
kit.push({ name: "START-HERE.txt", data: Buffer.from(
  "Open store/README.md for the upload guide.\n" +
  `Upload ZIPs are in release/${manifest.version}/.\n` +
  "Images and listing copy are in store/.\n" +
  "Publish PRIVACY.md at a public URL before Chrome submission.\n") });
await writeFile(path.join(release,
  `clipject-${manifest.version}-submission-kit.zip`), zip(kit));
console.log(`Release files: ${release}`);
