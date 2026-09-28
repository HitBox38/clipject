import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { publishChrome, required, requestJson } from "./chrome-web-store.mjs";
import { publishFirefox } from "./firefox-addons.mjs";
import { parseVersion } from "./release-version.mjs";

export async function publishRelease({ env, directory, fetcher = fetch }) {
  const version = required(env, "RELEASE_VERSION");
  parseVersion(version);
  const repository = required(env, "GITHUB_REPOSITORY");
  const sha = required(env, "GITHUB_SHA");
  const token = required(env, "GH_TOKEN");
  for (const key of [
    "CWS_PUBLISHER_ID",
    "CWS_EXTENSION_ID",
    "CWS_CLIENT_ID",
    "CWS_CLIENT_SECRET",
    "CWS_REFRESH_TOKEN",
    "AMO_JWT_ISSUER",
    "AMO_JWT_SECRET",
  ])
    required(env, key);

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const api = `https://api.github.com/repos/${repository}`;
  const tag = `v${version}`;
  const json = (url, method, body) =>
    requestJson(fetcher, url, {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const find = async (path) => {
    const response = await fetcher(`${api}/${path}`, {
      headers,
      signal: AbortSignal.timeout(120_000),
    });
    if (response.status === 404) return null;
    assert(response.ok, `GitHub ${path}: HTTP ${response.status}`);
    return response.json();
  };
  let release = await find(`releases/tags/${tag}`);
  // The tag endpoint only guarantees published releases. Include drafts on retry.
  if (!release) {
    for (let page = 1; ; page++) {
      const batch = await find(`releases?per_page=100&page=${page}`);
      assert(Array.isArray(batch), "Could not list GitHub releases");
      release = batch.find((item) => item.tag_name === tag);
      if (release || batch.length < 100) break;
    }
  }
  if (release) {
    assert.equal(
      release.target_commitish,
      sha,
      "Release belongs to another commit",
    );
    if (!release.draft) {
      console.log(`${tag} is already released: ${release.html_url}`);
      return release.html_url;
    }
  } else {
    const ref = await find(`git/ref/tags/${tag}`);
    assert(
      !ref || ref.object.sha === sha,
      "Tag already belongs to another commit",
    );
    release = await json(`${api}/releases`, "POST", {
      tag_name: tag,
      target_commitish: sha,
      name: `ClipJect ${tag}`,
      draft: true,
      generate_release_notes: true,
      body: `Built from ${sha}.`,
    });
  }

  const assets = await readdir(directory);
  const chromeName = `clipject-${version}-chrome.zip`;
  const firefoxName = `clipject-${version}-firefox.zip`;
  const sourceName = `clipject-${version}-source.zip`;
  assert(assets.includes(firefoxName), "Firefox archive is missing");
  assert(
    assets.includes(sourceName),
    "Firefox reviewer source archive is missing",
  );
  assert(assets.includes(chromeName), "Chrome archive is missing");
  assert(assets.includes("SHA256SUMS.txt"), "Checksums are missing");
  // Existing assets are immutable across retries, including after CWS submission.
  for (const name of assets) {
    assert(/^[\w.-]+$/.test(name), "Unexpected release asset name");
    const data = await readFile(`${directory}/${name}`);
    const digest = `sha256:${createHash("sha256").update(data).digest("hex")}`;
    const existing = release.assets.find((asset) => asset.name === name);
    if (existing) {
      assert.equal(
        existing.digest,
        digest,
        `Release asset changed on retry: ${name}`,
      );
      continue;
    }
    const uploadUrl = release.upload_url.split("{")[0];
    await requestJson(
      fetcher,
      `${uploadUrl}?name=${encodeURIComponent(name)}`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": name.endsWith(".zip")
            ? "application/zip"
            : "text/plain",
        },
        body: data,
      },
    );
  }

  const state = await publishChrome({
    env,
    version,
    archive: await readFile(`${directory}/${chromeName}`),
    fetcher,
  });
  const firefoxState = await publishFirefox({
    env,
    version,
    archive: await readFile(`${directory}/${firefoxName}`),
    source: await readFile(`${directory}/${sourceName}`),
    releaseNotes: await readFile(
      new URL("../store/release-notes.txt", import.meta.url),
      "utf8",
    ),
    reviewerNotes: await readFile(
      new URL("../store/reviewer-notes.txt", import.meta.url),
      "utf8",
    ),
    fetcher,
  });
  const published = await json(`${api}/releases/${release.id}`, "PATCH", {
    draft: false,
    body:
      `${release.body ?? ""}\n\nChrome Web Store submission: **${state}**. ` +
      "Availability in Chrome is subject to Google's review. " +
      `Firefox Add-ons submission: **${firefoxState}**. ` +
      "Availability in Firefox is subject to Mozilla's review.",
  });
  console.log(`Released ${tag}: ${published.html_url}`);
  return published.html_url;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const url = await publishRelease({
      env: process.env,
      directory: `release/${required(process.env, "RELEASE_VERSION")}`,
    });
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `[GitHub release](${url})\n`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
