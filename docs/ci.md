# CI and releases

PRs run **CI / Tests, lint, and builds**, an aggregate of independent jobs for
lint, strict application/test typechecking, Vitest coverage, Playwright Chromium
extension regressions, and validated Chrome/Firefox store packages. The same
checks run on pushes to `dev` and `master`. PR jobs have read-only repository
access and no publishing secrets. The existing aggregate check name is retained
for branch rules. See [TESTING.md](../TESTING.md) for local commands, test layout,
coverage gates, and browser failure reports.

Every push to `master` runs **Release**. This is the repository's current default
branch. If it is renamed to `main`, update the branch filter in
`.github/workflows/release.yml` and the environment's deployment branch rule.

## One-time setup

1. Create the ClipJect item in the Chrome Web Store Developer Dashboard if it
   does not exist. Complete its listing, privacy disclosures, distribution
   settings, and publisher account requirements using [the submission kit](../CHROMEWEBSTORE.md).
   This workflow updates that existing item; it does not create a store listing.
2. Follow Google's [API setup guide](https://developer.chrome.com/docs/webstore/using-api)
   to enable the Chrome Web Store API, create an OAuth client, and obtain a
   refresh token using the publisher's Google account and scope
   `https://www.googleapis.com/auth/chromewebstore`. Use your own OAuth client
   credentials in OAuth Playground. For unattended publishing, configure the
   OAuth consent app for production: refresh tokens for external apps left in
   Testing can [expire after seven days](https://developers.google.com/identity/protocols/oauth2#expiration).
3. In GitHub **Settings → Environments**, create `chrome-web-store`. Restrict
   deployment branches to `master`. Leave required reviewers disabled if every
   successful push should publish without manual approval.
4. Add the following environment variables and secrets (repository-level
   Actions variables/secrets also work):

| Name                | Kind     | Value                                                       |
| ------------------- | -------- | ----------------------------------------------------------- |
| `CWS_PUBLISHER_ID`  | Variable | Publisher → Settings → publisher ID in the Chrome dashboard |
| `CWS_EXTENSION_ID`  | Variable | The existing extension's item ID                            |
| `CWS_CLIENT_ID`     | Secret   | Google OAuth client ID                                      |
| `CWS_CLIENT_SECRET` | Secret   | Google OAuth client secret                                  |
| `CWS_REFRESH_TOKEN` | Secret   | Refresh token with Chrome Web Store publishing access       |

GitHub releases use the automatically supplied `GITHUB_TOKEN`, with
`contents: write` granted only to the publish job. No GitHub PAT is required.
Repository or organization policy must allow Actions to create releases/tags.
Do not add publishing credentials to the extension, `.env`, or source files.

## Versioning and artifacts

`package.json` and `manifest.json` hold the same three-part **base version**.
The release version adds the Release workflow's `github.run_number` to the
base patch number. Starting at `1.0.0`, run 1 produces `1.0.1`, run 2 produces
`1.0.2`, and so on. Failed runs can leave gaps. Rerunning an existing run keeps
the same version; `run_attempt` is deliberately excluded.

Only the build workspace is stamped. No bot commits are pushed to `master`,
so there is no release loop or need to bypass branch protection. The `vX.Y.Z`
tag points to the triggering source commit; its checked-in manifest still has
the base version. The attached **source ZIP**, unlike GitHub's automatically
generated source archives, includes the stamped manifest/package versions and
can reproduce the released version without knowing the workflow run number.

Before enabling CI, ensure the first generated version exceeds the version
already in the Chrome dashboard and any existing `vX.Y.Z` tags. If needed,
increase the base version in both JSON files. For a minor/major release, bump
both base versions together; the run counter continues increasing. Do not
decrease the base version, reset the workflow counter, or recreate this workflow
under another filename without checking version continuity. Chrome components
are limited to 65535; the script fails explicitly before overflow.

Builds use Node 24 and the pnpm version pinned in `package.json`. Verified
packages are transferred to the publishing job as a GitHub Actions artifact,
retained for 30 days. That job installs no project dependencies. It creates a
draft GitHub release with generated notes, uploads the existing packager's
Chrome ZIP, Firefox ZIP, stamped source ZIP, submission kit, and SHA256SUMS,
then uploads the Chrome ZIP using the Chrome Web Store v2 API. Firefox remains
a manual store submission.

After Chrome accepts the publish request, the GitHub release becomes public.
The release notes record the submission state. **PENDING_REVIEW is a successful
submission, not confirmation that the update is live.** Google controls the
review and publishes automatically after approval; no recurring monitor is
installed. Existing visibility and rollout settings are preserved.

## Failures and retries

- Release runs queue serially (up to GitHub's 100-run concurrency queue limit)
  and are never cancelled by another push. Store state is checked to prevent
  an older run from overwriting a newer version.
- If a different version is already pending review or staged, the run fails
  clearly and leaves the GitHub release as a draft. After the earlier version
  is published, use **Actions → Release → failed run → Re-run failed jobs**.
  The workflow does not cancel reviews or replace pending submissions.
- Upload processing is polled for up to five minutes. Failed/unknown upload
  states, rejected publication, HTTP errors, missing configuration, mismatched
  versions, and timeouts all fail the job.
- If Chrome accepted the version but the GitHub update failed, rerunning the
  failed job recognizes the accepted version and finishes the GitHub release.
  Existing draft assets are checked against SHA-256 digests before reuse.
  An already published GitHub release for the same commit is a no-op.
- For a failure before submission, retry the failed job after correcting the
  credentials or dashboard settings. If a crash occurred after upload but
  before submission and Chrome refuses the repeated upload, submit that draft
  manually in the dashboard, then retry the job. The API does not expose the
  current unsubmitted draft's version through `fetchStatus`, so the workflow
  does not guess which draft to publish.
- If an old failed run is retried after a newer version has been submitted,
  it refuses to downgrade. Use a new push for subsequent changes. A rejected
  store version may also need a fresh push/version after correcting the cause.
- If the build artifact expired, rerun all jobs to rebuild the same version.
  If an existing release asset's digest differs, investigate the build inputs;
  the workflow refuses to silently replace an already submitted package.

No live store request is needed for `pnpm test`; publishing is covered with
mocked Google and GitHub API responses. A real deployment still requires the
configuration above and a successful workflow run on GitHub.

References: [Chrome upload API](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/media/upload),
[Chrome publish API](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish),
[GitHub release API](https://docs.github.com/en/rest/releases/releases), and
[GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
