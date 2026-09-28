import assert from "node:assert/strict";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function parseVersion(version) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  const parts = version.split(".").map(Number);
  assert(
    parts.every((part) => part <= 65535),
    "Chrome version exceeds 65535",
  );
  return parts;
}

export function releaseVersion(base, runNumber) {
  const [major, minor, patch] = parseVersion(base);
  assert.match(String(runNumber), /^[1-9]\d*$/, "Invalid workflow run number");
  const nextPatch = patch + Number(runNumber);
  assert(nextPatch <= 65535, "Bump the base minor version and reset its patch");
  return `${major}.${minor}.${nextPatch}`;
}

export function compareVersions(left, right) {
  // Store history may use any of Chrome's one-to-four component versions.
  const chromeParts = (value) => {
    assert.match(value, /^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/);
    const parts = value.split(".").map(Number);
    assert(
      parts.every((part) => part <= 65535),
      "Invalid Chrome version",
    );
    return [...parts, ...Array(4 - parts.length).fill(0)];
  };
  const a = chromeParts(left);
  const b = chromeParts(right);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  }
  return 0;
}

export async function stampVersion(root, runNumber) {
  const files = ["package.json", "manifest.json"];
  const [pkg, manifest] = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(`${root}/${file}`))),
  );
  assert.equal(
    pkg.version,
    manifest.version,
    "Package/manifest versions differ",
  );
  const version = releaseVersion(pkg.version, runNumber);
  for (const [index, data] of [pkg, manifest].entries()) {
    data.version = version;
    await writeFile(
      `${root}/${files[index]}`,
      JSON.stringify(data, null, 2) + "\n",
    );
  }
  return version;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const version = await stampVersion(
    process.cwd(),
    process.env.GITHUB_RUN_NUMBER,
  );
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  }
  console.log(`Release version: ${version}`);
}
