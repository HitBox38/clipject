import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { required, requestJson } from "./chrome-web-store.mjs";
import { compareVersions, parseVersion } from "./release-version.mjs";

// Must match the immutable ID in vite.config.ts and the published AMO listing.
const addonId = "clipject@tomer-norman.dev";
const api = "https://addons.mozilla.org/api/v5/addons";
const endpoint = `${api}/addon/${encodeURIComponent(addonId)}/versions/`;

export async function publishFirefox({
  env,
  version,
  archive,
  source,
  releaseNotes,
  reviewerNotes,
  fetcher = fetch,
  sleep = setTimeout,
}) {
  parseVersion(version);
  const issuer = required(env, "AMO_JWT_ISSUER");
  const secret = required(env, "AMO_JWT_SECRET");
  assert(archive?.length, "Firefox archive is missing");
  assert(source?.length, "Firefox reviewer source archive is missing");
  assert(releaseNotes?.trim(), "Firefox release notes are missing");
  assert(reviewerNotes?.trim(), "Firefox reviewer notes are missing");
  const request = (url, options = {}) => {
    // Generate a fresh short-lived JWT for every request, including polling.
    const iat = Math.floor(Date.now() / 1000);
    const encode = (value) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const payload = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
      iss: issuer,
      jti: randomUUID(),
      iat,
      exp: iat + 180,
    })}`;
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    return requestJson(fetcher, url, {
      ...options,
      redirect: "error",
      headers: {
        ...options.headers,
        Authorization: `JWT ${payload}.${signature}`,
      },
    });
  };

  // Include pending/rejected versions; the public list hides these by default.
  const versions = [];
  for (let page = 1; ; page++) {
    const batch = await request(
      `${endpoint}?filter=all_with_unlisted&page=${page}`,
    );
    assert(Array.isArray(batch.results), "Could not list Firefox versions");
    versions.push(...batch.results);
    // Construct our own next URL so credentials never follow a server-supplied URL.
    if (!batch.next) break;
  }
  for (const item of versions) {
    assert(
      compareVersions(item.version, version) <= 0,
      `Firefox has newer version ${item.version}; refusing an older release`,
    );
  }
  let submitted = versions.find((item) => item.version === version);
  if (submitted) {
    submitted = await request(`${endpoint}${encodeURIComponent(version)}/`);
  } else {
    assert(
      !versions.some(
        (item) =>
          item.channel === "listed" &&
          item.file?.status === "unreviewed" &&
          !item.is_disabled,
      ),
      "Another Firefox version is under review. Rerun after it is published.",
    );
    const uploadBody = new FormData();
    uploadBody.set("channel", "listed");
    uploadBody.set(
      "upload",
      new Blob([archive], { type: "application/zip" }),
      `clipject-${version}-firefox.zip`,
    );
    let upload = await request(`${api}/upload/`, {
      method: "POST",
      body: uploadBody,
    });
    assert(upload.uuid, "Firefox upload response has no ID");
    const uploadUrl = `${api}/upload/${encodeURIComponent(upload.uuid)}/`;
    for (let attempt = 0; !upload.processed && attempt < 30; attempt++) {
      await sleep(10_000);
      upload = await request(uploadUrl);
    }
    assert(upload.processed, "Firefox validation timed out");
    assert(
      upload.valid,
      "Firefox validation failed; see the AMO developer dashboard",
    );
    assert.equal(upload.version, version, "Firefox upload version differs");
    assert.equal(upload.channel, "listed", "Firefox upload channel differs");
    submitted = await request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload: upload.uuid,
        compatibility: ["firefox"],
        release_notes: { "en-US": releaseNotes },
        approval_notes: reviewerNotes,
      }),
    });
  }
  assert.equal(submitted.version, version, "Firefox submitted version differs");
  assert.equal(submitted.channel, "listed", "Firefox version is not listed");
  const submissionState = (item) => {
    assert(
      !item.is_disabled && ["public", "unreviewed"].includes(item.file?.status),
      "Firefox version is disabled, rejected, or has an unknown state; check AMO",
    );
    return item.file.status === "public" ? "PUBLISHED" : "PENDING_REVIEW";
  };
  submissionState(submitted);
  // Source needs a separate multipart request. Repair an interrupted submission
  // on retry before reporting success; never replace an existing source upload.
  if (!submitted.source) {
    const body = new FormData();
    body.set(
      "source",
      new Blob([source], { type: "application/zip" }),
      `clipject-${version}-source.zip`,
    );
    const updated = await request(
      `${endpoint}${encodeURIComponent(version)}/`,
      {
        method: "PATCH",
        body,
      },
    );
    assert(updated.source, "Firefox reviewer source upload was not confirmed");
    submitted = updated;
  }
  return submissionState(submitted);
}
