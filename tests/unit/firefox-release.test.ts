import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "vitest";
import { publishFirefox } from "../../scripts/firefox-addons.mjs";

const options = {
  env: { AMO_JWT_ISSUER: "user:123:456", AMO_JWT_SECRET: "test-secret" },
  version: "1.0.7",
  archive: Buffer.from("firefox-zip"),
  source: Buffer.from("reviewer-source"),
  releaseNotes: "Release changes",
  reviewerNotes: "Build with pnpm run release; see BUILDING.md",
};
const listed = (version = "1.0.7", status = "unreviewed") => ({
  version,
  channel: "listed",
  file: { status },
  source: null as string | null,
});
const validUpload = {
  uuid: "upload-id",
  processed: true,
  valid: true,
  version: "1.0.7",
  channel: "listed",
};
const listPath = "/versions/?filter=all_with_unlisted&page=1";
type Step = [string, unknown, number?];
function sequence(steps: Step[]) {
  const calls: Array<RequestInit & { url: string }> = [];
  return {
    calls,
    fetcher: async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({ url, ...init });
      assert(steps.length, `Unexpected request: ${url}`);
      const [suffix, data, status = 200] = steps.shift()!;
      assert(url.endsWith(suffix), `${url} should end with ${suffix}`);
      return new Response(JSON.stringify(data), { status });
    },
    done: () => assert.equal(steps.length, 0),
  };
}
const noSleep = async <T = void>(_ms = 0, value?: T) => value as T;

test("Firefox validates the release ZIP, submits desktop metadata, and attaches source", async () => {
  const mock = sequence([
    [listPath, { results: [], next: null }],
    ["/upload/", { uuid: "upload-id", processed: false }],
    ["/upload/upload-id/", validUpload],
    ["/versions/", listed()],
    [
      "/versions/1.0.7/",
      { ...listed(), source: "https://example.com/source.zip" },
    ],
  ]);
  assert.equal(
    await publishFirefox({ ...options, fetcher: mock.fetcher, sleep: noSleep }),
    "PENDING_REVIEW",
  );
  const upload = mock.calls[1].body as FormData;
  assert.equal(upload.get("channel"), "listed");
  assert.equal(await (upload.get("upload") as File).text(), "firefox-zip");
  assert.equal(mock.calls[3].method, "POST");
  assert.deepEqual(JSON.parse(String(mock.calls[3].body)), {
    upload: "upload-id",
    compatibility: ["firefox"],
    release_notes: { "en-US": options.releaseNotes },
    approval_notes: options.reviewerNotes,
  });
  assert.equal(mock.calls[4].method, "PATCH");
  assert.equal(
    await ((mock.calls[4].body as FormData).get("source") as File).text(),
    "reviewer-source",
  );
  // Verify signatures and lifetime, including a fresh nonce for each poll.
  const nonces = new Set();
  for (const call of mock.calls) {
    const auth = new Headers(call.headers).get("Authorization")!;
    const [header, payload, signature] = auth.slice(4).split(".");
    assert(auth.startsWith("JWT "));
    assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), {
      alg: "HS256",
      typ: "JWT",
    });
    assert.equal(
      signature,
      createHmac("sha256", options.env.AMO_JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest("base64url"),
    );
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    assert.equal(claims.iss, options.env.AMO_JWT_ISSUER);
    assert.equal(claims.exp - claims.iat, 180);
    nonces.add(claims.jti);
    assert.equal(call.redirect, "error");
  }
  assert.equal(nonces.size, mock.calls.length);
  mock.done();
});

for (const status of ["public", "unreviewed"]) {
  for (const hasSource of [true, false]) {
    test(`Firefox retry reuses ${status} version and repairs missing source: ${!hasSource}`, async () => {
      const item = {
        ...listed("1.0.7", status),
        source: hasSource ? "https://example.com/source.zip" : null,
      };
      const steps: Step[] = [
        [listPath, { results: [item], next: null }],
        ["/versions/1.0.7/", item],
      ];
      if (!hasSource)
        steps.push([
          "/versions/1.0.7/",
          { ...item, source: "https://example.com/source.zip" },
        ]);
      const mock = sequence(steps);
      assert.equal(
        await publishFirefox({ ...options, fetcher: mock.fetcher }),
        status === "public" ? "PUBLISHED" : "PENDING_REVIEW",
      );
      assert(!mock.calls.some((call) => call.method === "POST"));
      mock.done();
    });
  }
}

for (const [item, error] of [
  [listed("1.0.8", "public"), /newer version/],
  [listed("1.0.6"), /under review/],
  [listed("1.0.7", "disabled"), /disabled, rejected/],
  [{ ...listed(), is_disabled: true }, /disabled, rejected/],
  [{ ...listed(), channel: "unlisted" }, /not listed/],
  [listed("1.0.7", "unknown"), /unknown state/],
] as const) {
  test(`Firefox blocks unsafe submission: ${JSON.stringify(item)}`, async () => {
    const steps: Step[] = [[listPath, { results: [item], next: null }]];
    if (item.version === options.version)
      steps.push(["/versions/1.0.7/", item]);
    const mock = sequence(steps);
    await assert.rejects(
      publishFirefox({ ...options, fetcher: mock.fetcher }),
      error,
    );
    assert(!mock.calls.some((call) => call.method));
    mock.done();
  });
}

test("Firefox scans later pages without following arbitrary URLs", async () => {
  const mock = sequence([
    [
      listPath,
      {
        results: [listed("1.0.6", "public")],
        next: "https://untrusted.example/",
      },
    ],
    [
      "/versions/?filter=all_with_unlisted&page=2",
      { results: [listed("1.0.8", "public")], next: null },
    ],
  ]);
  await assert.rejects(
    publishFirefox({ ...options, fetcher: mock.fetcher }),
    /newer version/,
  );
  assert(
    mock.calls.every((call) =>
      call.url.startsWith("https://addons.mozilla.org/"),
    ),
  );
  mock.done();
});

for (const [upload, message] of [
  [{ ...validUpload, valid: false }, /validation failed/],
  [{ ...validUpload, version: "1.0.8" }, /version differs/],
  [{ ...validUpload, channel: "unlisted" }, /channel differs/],
] as const) {
  test(`Firefox rejects invalid uploads: ${message}`, async () => {
    const mock = sequence([
      [listPath, { results: [], next: null }],
      ["/upload/", upload],
    ]);
    await assert.rejects(
      publishFirefox({ ...options, fetcher: mock.fetcher }),
      message,
    );
    mock.done();
  });
}

test("Firefox validation polling stops at its deadline", async () => {
  const pending = { uuid: "upload-id", processed: false };
  const mock = sequence([
    [listPath, { results: [], next: null }],
    ["/upload/", pending],
    ...Array.from({ length: 30 }, (): Step => ["/upload/upload-id/", pending]),
  ]);
  await assert.rejects(
    publishFirefox({ ...options, fetcher: mock.fetcher, sleep: noSleep }),
    /timed out/,
  );
  mock.done();
});

test("Firefox source failures do not report success", async () => {
  const mock = sequence([
    [listPath, { results: [listed()], next: null }],
    ["/versions/1.0.7/", listed()],
    ["/versions/1.0.7/", listed()],
  ]);
  await assert.rejects(
    publishFirefox({ ...options, fetcher: mock.fetcher }),
    /source upload was not confirmed/,
  );
  mock.done();
});

test("missing credentials fail before network access and API errors hide secrets", async () => {
  for (const key of ["AMO_JWT_ISSUER", "AMO_JWT_SECRET"] as const) {
    const mock = sequence([]);
    await assert.rejects(
      publishFirefox({
        ...options,
        env: { ...options.env, [key]: "" },
        fetcher: mock.fetcher,
      }),
      /Missing AMO/,
    );
    mock.done();
  }
  const mock = sequence([[listPath, { secret: "do-not-log" }, 401]]);
  await assert.rejects(
    publishFirefox({ ...options, fetcher: mock.fetcher }),
    (error: Error) =>
      /HTTP 401/.test(error.message) && !error.message.includes("do-not-log"),
  );
  mock.done();
});

test("Firefox rechecks review status after attaching source", async () => {
  const mock = sequence([
    [listPath, { results: [listed()], next: null }],
    ["/versions/1.0.7/", listed()],
    [
      "/versions/1.0.7/",
      {
        ...listed("1.0.7", "disabled"),
        source: "https://example.com/source.zip",
      },
    ],
  ]);
  await assert.rejects(
    publishFirefox({ ...options, fetcher: mock.fetcher }),
    /disabled, rejected/,
  );
  mock.done();
});
