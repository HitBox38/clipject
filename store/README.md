# ClipJect submission kit

Version 1.0.0 · prepared September 23, 2026 · not submitted to either store.

Everything is also bundled in
`release/1.0.0/clipject-1.0.0-submission-kit.zip`. Extract it and open this guide.

## What to upload

| Store / field | File |
| --- | --- |
| Chrome: extension | `release/1.0.0/clipject-1.0.0-chrome.zip` |
| Firefox: add-on | `release/1.0.0/clipject-1.0.0-firefox.zip` |
| Firefox: source code | `release/1.0.0/clipject-1.0.0-source.zip` |
| Both: icon | `store/assets/icon-128.png` |
| Both: screenshots | Four numbered PNGs in `store/assets/` |
| Chrome: small promotional tile | `store/assets/promo-small-440x280.png` |
| Chrome: optional marquee | `store/assets/promo-marquee-1400x560.png` |

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

## Remaining steps in your accounts

1. The approved privacy policy is included in the push to the public `main`
   branch. Its URL is
   `https://github.com/HitBox38/clipject/blob/main/PRIVACY.md`.
   Verify it opens while signed out after the push.
2. Upload each store's matching ZIP. Firefox also needs the separate source ZIP.
3. Paste listing fields, attach images, and enter privacy disclosures. Use the
   GitHub Issues support URL; a support mailbox has not been created. Complete
   contact/trader/account fields using your own details in the dashboards.
4. In current desktop Firefox, complete a manual save/paste and popup/library
   smoke test before submission. Temporary install and background startup
   passed; full Firefox UI automation was unavailable (see verification).
5. Check the preview and validation results, then submit for review. Choose
   visibility, regions, and automatic/manual publication settings as desired.

The privacy policy is published with this push; no store listing was submitted.
Store approval is a separate process.

## Rebuild

```sh
pnpm install --frozen-lockfile
pnpm run release
```

Keep package and manifest versions equal. ZIPs and SHA-256 sums are generated
in `release/<version>/`, ignored by Git. The source ZIP uses an explicit
allowlist excluding profiles, secrets, and caches. Refresh screenshots when
the UI changes.
