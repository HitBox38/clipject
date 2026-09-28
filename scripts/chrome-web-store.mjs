import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { compareVersions } from "./release-version.mjs";

const accepted = new Set([
  "PENDING_REVIEW",
  "PUBLISHED",
  "PUBLISHED_TO_TESTERS",
]);

export function required(env, key) {
  assert(env[key]?.trim(), `Missing ${key}; see docs/ci.md`);
  return env[key];
}

export async function requestJson(fetcher, url, options = {}) {
  const response = await fetcher(url, {
    ...options,
    signal: AbortSignal.timeout(120_000),
  });
  // Never log response bodies: OAuth responses can contain credentials.
  assert(response.ok, `${new URL(url).pathname}: HTTP ${response.status}`);
  return response.json();
}

export async function publishChrome({
  env,
  version,
  archive,
  fetcher = fetch,
  sleep = setTimeout,
}) {
  const publisher = required(env, "CWS_PUBLISHER_ID");
  const extension = required(env, "CWS_EXTENSION_ID");
  const clientId = required(env, "CWS_CLIENT_ID");
  const clientSecret = required(env, "CWS_CLIENT_SECRET");
  const refreshToken = required(env, "CWS_REFRESH_TOKEN");
  const token = await requestJson(
    fetcher,
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    },
  );
  assert(token.access_token, "OAuth response has no access token");
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const host = "https://chromewebstore.googleapis.com";
  const name = `publishers/${encodeURIComponent(publisher)}/items/${encodeURIComponent(extension)}`;
  const endpoint = `${host}/v2/${name}`;
  const status = () =>
    requestJson(fetcher, `${endpoint}:fetchStatus`, { headers });
  const before = await status();
  const submitted = before.submittedItemRevisionStatus;
  const revisions = [before.publishedItemRevisionStatus, submitted].filter(
    Boolean,
  );
  for (const revision of revisions) {
    for (const channel of revision.distributionChannels ?? []) {
      assert(
        compareVersions(channel.crxVersion, version) <= 0,
        `Store has newer version ${channel.crxVersion}; refusing an older release`,
      );
    }
  }
  for (const revision of revisions) {
    if (
      accepted.has(revision.state) &&
      revision.distributionChannels?.some((item) => item.crxVersion === version)
    ) {
      return revision.state; // Retry after a successful submission.
    }
  }
  assert(
    !["PENDING_REVIEW", "STAGED"].includes(submitted?.state),
    "Another version is under review or staged. Rerun after it is published.",
  );
  assert(
    !before.takenDown,
    "Resolve the store takedown in the developer dashboard",
  );

  const upload = await requestJson(
    fetcher,
    `${host}/upload/v2/${name}:upload`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/zip" },
      body: archive,
    },
  );
  if (upload.crxVersion) assert.equal(upload.crxVersion, version);
  let state = upload.uploadState;
  for (let attempt = 0; state === "IN_PROGRESS" && attempt < 30; attempt++) {
    await sleep(10_000);
    state = (await status()).lastAsyncUploadState;
  }
  assert.equal(state, "SUCCEEDED", `Chrome upload did not succeed: ${state}`);
  const result = await requestJson(fetcher, `${endpoint}:publish`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
  });
  assert(
    accepted.has(result.state),
    `Unexpected publish state: ${result.state}`,
  );
  return result.state;
}
