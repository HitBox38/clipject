# ClipJect submission kit

Version 1.0.1 · prepared September 29, 2026.

Download the generated packages from
[GitHub Releases](https://github.com/HitBox38/clipject/releases). Chrome and Firefox
submission states are recorded in the release.

Everything is also bundled in
`release/1.0.1/clipject-1.0.1-submission-kit.zip`. Extract it and open this guide.

## What to upload

| Store / field                  | File                                       |
| ------------------------------ | ------------------------------------------ |
| Chrome: extension              | `release/1.0.1/clipject-1.0.1-chrome.zip`  |
| Firefox: add-on                | `release/1.0.1/clipject-1.0.1-firefox.zip` |
| Firefox: source code           | `release/1.0.1/clipject-1.0.1-source.zip`  |
| Both: icon                     | `store/assets/icon-128.png`                |
| Both: screenshots              | Four numbered PNGs in `store/assets/`      |
| Chrome: small promotional tile | `store/assets/promo-small-440x280.png`     |
| Chrome: optional marquee       | `store/assets/promo-marquee-1400x560.png`  |

Paths are relative to the repository root. Do not upload the source ZIP or
whole repository as the installable extension.

## Copy-and-paste material

- [Chrome dashboard fields](../CHROMEWEBSTORE.md): listing, permission reasons,
  and privacy disclosures.
- [Firefox dashboard fields](../FIREFOXADDONS.md): source upload and captions.
- [Listing description](listing-description.txt) for either store.
- [Reviewer notes](reviewer-notes.txt) and [release notes](release-notes.txt).
- [Privacy policy](../PRIVACY.md), [MIT license](../LICENSE), and
  [build instructions](../BUILDING.md).
- [Verification record](VERIFICATION.md).

## Submission status and remaining steps

The Release workflow submits Chrome and Firefox updates using the configured
publisher accounts. Firefox submission includes release notes and the reviewer
source archive. Check the workflow result and GitHub release before attempting
a manual upload. Pending review does not mean an update is live.

Complete a save/paste and popup/library smoke test in current desktop Firefox.
Chromium has automated runtime coverage; full Firefox UI verification remains
outstanding. Check signed builds after store approval.

If submission fails, follow [CI retry instructions](../docs/ci.md) and inspect
the store's validation result before retrying. Account-specific listing and
distribution settings remain in the publisher dashboards.

The privacy policy is available on the public `master` branch at
`https://github.com/HitBox38/clipject/blob/master/PRIVACY.md`.
Use the GitHub Issues support URL; no separate support mailbox was created.

## Rebuild

```sh
pnpm install --frozen-lockfile
pnpm run release
```

Local builds use the checked-in base version (currently 1.0.0). The Release
workflow stamps the release version into both JSON files before packaging.
The attached source ZIP already has the release version stamped.
Keep package and manifest versions equal. ZIPs and SHA-256 sums are generated
in `release/<version>/`, ignored by Git. The source ZIP uses an explicit
allowlist excluding profiles, secrets, and caches. Refresh screenshots when
the UI changes.
