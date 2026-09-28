import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, type TestContext } from "vitest";
import {
  compareVersions,
  releaseVersion,
  stampVersion,
} from "../../scripts/release-version.mjs";
import { publishChrome } from "../../scripts/chrome-web-store.mjs";
import { publishRelease } from "../../scripts/publish-release.mjs";

const env = {
  RELEASE_VERSION: "1.0.7",
  GITHUB_REPOSITORY: "owner/repo",
  GITHUB_SHA: "abc123",
  GH_TOKEN: "github-test-token",
  CWS_PUBLISHER_ID: "publisher",
  CWS_EXTENSION_ID: "extension",
  CWS_CLIENT_ID: "client",
  CWS_CLIENT_SECRET: "secret",
  CWS_REFRESH_TOKEN: "refresh",
  AMO_JWT_ISSUER: "user:123:456",
  AMO_JWT_SECRET: "amo-secret",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const revision = (version: string, state: string) => ({
  state,
  distributionChannels: [{ crxVersion: version }],
});
type Step = [string, unknown, number?];
function sequence(steps: Step[]) {
  const calls: Array<RequestInit & { url: string }> = [];
  return {
    calls,
    fetcher: async (
      request: string | URL | Request,
      options: RequestInit = {},
    ) => {
      const url =
        typeof request === "string"
          ? request
          : request instanceof URL
            ? request.href
            : request.url;
      calls.push({ url, ...options });
      assert(steps.length > 0, `Unexpected request: ${url}`);
      const [suffix, data, status] = steps.shift()!;
      assert(url.endsWith(suffix), `${url} should end with ${suffix}`);
      return reply(data, status);
    },
    done: () => assert.equal(steps.length, 0),
  };
}
async function temporary(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "clipject-ci-"));
  t.onTestFinished(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("versions increase numerically, repeat on reruns, and reject overflow", () => {
  assert.equal(compareVersions("1.0.7.0", "1.0.7"), 0);
  assert.equal(compareVersions("1.0.10", "1.0.7"), 1);
  assert.equal(releaseVersion("1.0.0", "7"), "1.0.7");
  assert.equal(releaseVersion("1.0.5", "7"), "1.0.12");
  assert.equal(releaseVersion("1.0.0", "7"), "1.0.7");
  for (const value of [undefined, "0", "-1", "1x", "65536"]) {
    assert.throws(() => releaseVersion("1.0.0", value));
  }
  for (const value of ["1.0.0-beta", "1.02.0", "65536.0.0"]) {
    assert.throws(() => releaseVersion(value, "1"));
  }
});

test("stamping synchronizes package and manifest without changing metadata", async (t) => {
  const root = await temporary(t);
  for (const file of ["package.json", "manifest.json"]) {
    await writeFile(
      `${root}/${file}`,
      JSON.stringify({ version: "1.0.0", name: "ClipJect" }),
    );
  }
  assert.equal(await stampVersion(root, "7"), "1.0.7");
  for (const file of ["package.json", "manifest.json"]) {
    assert.deepEqual(JSON.parse(await readFile(`${root}/${file}`, "utf8")), {
      version: "1.0.7",
      name: "ClipJect",
    });
  }
  await writeFile(`${root}/manifest.json`, '{"version":"2.0.0"}');
  await assert.rejects(stampVersion(root, "8"), /versions differ/);
});

test("Chrome upload waits for processing before submitting for automatic publication", async () => {
  const mock = sequence([
    ["/token", { access_token: "token" }],
    [":fetchStatus", {}],
    [":upload", { uploadState: "IN_PROGRESS" }],
    [":fetchStatus", { lastAsyncUploadState: "SUCCEEDED" }],
    [":publish", { state: "PENDING_REVIEW" }],
  ]);
  const sleeps: number[] = [];
  assert.equal(
    await publishChrome({
      archive: Buffer.from("zip"),
      env,
      version: "1.0.7",
      fetcher: mock.fetcher,
      sleep: async <T = void>(ms = 0, value?: T) => {
        sleeps.push(ms);
        return value as T;
      },
    }),
    "PENDING_REVIEW",
  );
  assert.deepEqual(sleeps, [10000]);
  assert.equal(mock.calls[2].method, "POST");
  assert(mock.calls[2].url.includes("/upload/v2/"));
  assert.deepEqual(JSON.parse(String(mock.calls[4].body)), {
    publishType: "DEFAULT_PUBLISH",
  });
  mock.done();
});

for (const state of ["PENDING_REVIEW", "PUBLISHED"]) {
  test(`Chrome retry does not upload an already ${state} version`, async () => {
    const mock = sequence([
      ["/token", { access_token: "token" }],
      [
        ":fetchStatus",
        { submittedItemRevisionStatus: revision("1.0.7", state) },
      ],
    ]);
    assert.equal(
      await publishChrome({
        archive: Buffer.from("zip"),
        env,
        version: "1.0.7",
        fetcher: mock.fetcher,
      }),
      state,
    );
    mock.done();
  });
}

for (const [status, message] of [
  [
    { submittedItemRevisionStatus: revision("1.0.6", "PENDING_REVIEW") },
    /under review/,
  ],
  [{ submittedItemRevisionStatus: revision("1.0.7", "STAGED") }, /staged/],
  [
    { publishedItemRevisionStatus: revision("1.0.10", "PUBLISHED") },
    /newer version/,
  ],
] as const) {
  test(`Chrome blocks unsafe uploads: ${message}`, async () => {
    const mock = sequence([
      ["/token", { access_token: "token" }],
      [":fetchStatus", status],
    ]);
    await assert.rejects(
      publishChrome({
        archive: Buffer.from("zip"),
        env,
        version: "1.0.7",
        fetcher: mock.fetcher,
      }),
      message,
    );
    mock.done();
  });
}

test("failed uploads and rejected publish responses fail the release", async () => {
  for (const failedUpload of [true, false]) {
    const steps: Step[] = [
      ["/token", { access_token: "token" }],
      [":fetchStatus", {}],
      [
        ":upload",
        {
          uploadState: failedUpload ? "FAILED" : "SUCCEEDED",
          crxVersion: "1.0.7",
        },
      ],
    ];
    if (!failedUpload) steps.push([":publish", { state: "REJECTED" }]);
    const mock = sequence(steps);
    await assert.rejects(
      publishChrome({
        archive: Buffer.from("zip"),
        env,
        version: "1.0.7",
        fetcher: mock.fetcher,
      }),
      failedUpload ? /did not succeed/ : /Unexpected publish state/,
    );
    mock.done();
  }
});

test("asynchronous upload polling has a deadline", async () => {
  const steps: Step[] = [
    ["/token", { access_token: "token" }],
    [":fetchStatus", {}],
    [":upload", { uploadState: "IN_PROGRESS" }],
    ...Array.from({ length: 30 }, (): Step => [
      ":fetchStatus",
      { lastAsyncUploadState: "IN_PROGRESS" },
    ]),
  ];
  const mock = sequence(steps);
  await assert.rejects(
    publishChrome({
      archive: Buffer.from("zip"),
      env,
      version: "1.0.7",
      fetcher: mock.fetcher,
      sleep: async <T = void>(ms = 0, value?: T) => {
        void ms;
        return value as T;
      },
    }),
    /did not succeed/,
  );
  mock.done();
});

test("OAuth failures do not expose response credentials", async () => {
  await assert.rejects(
    publishChrome({
      archive: Buffer.from("zip"),
      env,
      version: "1.0.7",
      fetcher: async () => reply({ secret: "do-not-log" }, 401),
    }),
    (error: Error) =>
      /HTTP 401/.test(error.message) && !error.message.includes("do-not-log"),
  );
  await assert.rejects(
    publishChrome({ archive: Buffer.from("zip"), env: {}, version: "1.0.7" }),
    /Missing CWS_PUBLISHER_ID/,
  );
});

test("release retries reuse draft assets and finish after an accepted Chrome submission", async (t) => {
  const root = await temporary(t);
  const assets = [];
  for (const name of [
    "clipject-1.0.7-chrome.zip",
    "clipject-1.0.7-firefox.zip",
    "clipject-1.0.7-source.zip",
    "SHA256SUMS.txt",
  ]) {
    const data = Buffer.from(name);
    await writeFile(`${root}/${name}`, data);
    assets.push({
      name,
      digest: `sha256:${createHash("sha256").update(data).digest("hex")}`,
    });
  }
  const draft = {
    id: 42,
    tag_name: "v1.0.7",
    target_commitish: "abc123",
    draft: true,
    body: "Generated notes",
    assets,
  };
  const mock = sequence([
    ["/releases/tags/v1.0.7", {}, 404],
    ["/releases?per_page=100&page=1", [draft]],
    ["/token", { access_token: "token" }],
    [
      ":fetchStatus",
      { submittedItemRevisionStatus: revision("1.0.7", "PENDING_REVIEW") },
    ],
    [
      "/versions/?filter=all_with_unlisted&page=1",
      { results: [{ version: "1.0.7" }], next: null },
    ],
    [
      "/versions/1.0.7/",
      {
        version: "1.0.7",
        channel: "listed",
        file: { status: "unreviewed" },
        source: "https://example.com/source.zip",
      },
    ],
    [
      "/releases/42",
      { html_url: "https://github.com/owner/repo/releases/tag/v1.0.7" },
    ],
  ]);
  await publishRelease({ env, directory: root, fetcher: mock.fetcher });
  assert.equal(mock.calls.at(-1)!.method, "PATCH");
  assert.equal(JSON.parse(String(mock.calls.at(-1)!.body)).draft, false);
  assert.match(
    JSON.parse(String(mock.calls.at(-1)!.body)).body,
    /Generated notes/,
  );
  assert.match(
    JSON.parse(String(mock.calls.at(-1)!.body)).body,
    /Firefox Add-ons submission: \*\*PENDING_REVIEW\*\*/,
  );
  mock.done();

  // Chrome already accepted this version, but Firefox failed: retain the draft.
  const firefoxFailure = sequence([
    ["/releases/tags/v1.0.7", draft],
    ["/token", { access_token: "token" }],
    [
      ":fetchStatus",
      { submittedItemRevisionStatus: revision("1.0.7", "PENDING_REVIEW") },
    ],
    ["/versions/?filter=all_with_unlisted&page=1", {}, 401],
  ]);
  await assert.rejects(
    publishRelease({ env, directory: root, fetcher: firefoxFailure.fetcher }),
    /HTTP 401/,
  );
  assert(!firefoxFailure.calls.some((call) => call.method === "PATCH"));
  firefoxFailure.done();

  assets[0].digest = "sha256:changed";
  const changed = sequence([["/releases/tags/v1.0.7", draft]]);
  await assert.rejects(
    publishRelease({ env, directory: root, fetcher: changed.fetcher }),
    /asset changed/,
  );
});

test("new releases upload assets and remain drafts if Chrome fails", async (t) => {
  const root = await temporary(t);
  for (const name of [
    "clipject-1.0.7-chrome.zip",
    "clipject-1.0.7-firefox.zip",
    "clipject-1.0.7-source.zip",
    "SHA256SUMS.txt",
  ]) {
    await writeFile(`${root}/${name}`, name);
  }
  const mock = sequence([
    ["/releases/tags/v1.0.7", {}, 404],
    ["/releases?per_page=100&page=1", []],
    ["/git/ref/tags/v1.0.7", {}, 404],
    [
      "/releases",
      {
        id: 42,
        draft: true,
        assets: [],
        upload_url: "https://uploads.github.com/assets{?name}",
      },
    ],
    ["?name=SHA256SUMS.txt", {}],
    ["?name=clipject-1.0.7-chrome.zip", {}],
    ["?name=clipject-1.0.7-firefox.zip", {}],
    ["?name=clipject-1.0.7-source.zip", {}],
    ["/token", {}, 401],
  ]);
  await assert.rejects(
    publishRelease({ env, directory: root, fetcher: mock.fetcher }),
    /HTTP 401/,
  );
  const creation = JSON.parse(String(mock.calls[3].body));
  assert.equal(creation.draft, true);
  assert.equal(creation.target_commitish, env.GITHUB_SHA);
  assert.equal(creation.generate_release_notes, true);
  assert(!mock.calls.some((call) => call.method === "PATCH"));
  mock.done();
});

test("published releases are idempotent and conflicting commits are rejected", async () => {
  for (const target of [env.GITHUB_SHA, "another-commit"]) {
    const mock = sequence([
      [
        "/releases/tags/v1.0.7",
        {
          target_commitish: target,
          draft: false,
          html_url: "https://github.com/release",
        },
      ],
    ]);
    const result = publishRelease({
      env,
      directory: "/unused",
      fetcher: mock.fetcher,
    });
    if (target === env.GITHUB_SHA) await result;
    else await assert.rejects(result, /another commit/);
    mock.done();
  }
});

test("missing Firefox secrets fail before Chrome or GitHub requests", async () => {
  const mock = sequence([]);
  await assert.rejects(
    publishRelease({
      env: { ...env, AMO_JWT_SECRET: "" },
      directory: "/unused",
      fetcher: mock.fetcher,
    }),
    /Missing AMO_JWT_SECRET/,
  );
  mock.done();
});
