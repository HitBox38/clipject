# Firefox Add-ons submission — ClipJect

Prepared September 23, 2026 for version 1.0.0. Not submitted or signed.

## Files and listing fields

| AMO field | Value / file |
| --- | --- |
| Distribution | On this site (listed on addons.mozilla.org) |
| Add-on package | `release/1.0.0/clipject-1.0.0-firefox.zip` |
| Provide source code? | Yes: Vite bundles/minifies the source |
| Source code | `release/1.0.0/clipject-1.0.0-source.zip` |
| Build instructions | `BUILDING.md`, also in the source archive |
| Name | ClipJect |
| Suggested slug | clipject (AMO checks availability) |
| Summary | Save reusable text and paste it into fields you choose. Keep snippets for a specific field or use them across websites. |
| Description | `store/listing-description.txt` |
| Language | English (en-US) |
| Category | Other |
| License | MIT License (see `LICENSE`) |
| Support website | `https://github.com/HitBox38/clipject/issues` |
| Homepage | `https://github.com/HitBox38/clipject` |
| Requires payment or additional software/hardware | No |
| Platforms | Desktop Windows, macOS, Linux; do not select Android for this release |
| Privacy policy | Paste `PRIVACY.md` into the policy field |
| Notes for reviewers | `store/reviewer-notes.txt` |
| Release notes | `store/release-notes.txt` |

Use the public support website; no separate support email is supplied. The
experimental designation is your choice in AMO, not selected by this kit.

## Firefox package details

This Manifest V3 build uses module background scripts instead of Chrome's
service worker. CRXJS's Firefox target removes `use_dynamic_url` properties.

- Add-on ID: `clipject@tomer-norman.dev`. This is an identifier, not a contact
  email or verified mailbox. Keep it unchanged for updates.
- Minimum desktop Firefox: 140.0.
- `data_collection_permissions.required`: `["none"]`. The extension sends no
  data outside the local browser. This is Mozilla's transmission-based
  definition; local snippet/page storage is described in the privacy policy.
- No custom update URL. AMO manages updates for this listed extension.

Upload the ZIP directly. AMO signs the accepted add-on. The prepared ZIP is
not a signed XPI for permanent installation in release Firefox. To review it
locally, load `dist-firefox/manifest.json` through `about:debugging` →
This Firefox → Load Temporary Add-on.

## Images

Use `store/assets/icon-128.png` and the four numbered 1280 × 800 screenshots.
They show the shared UI in a Chromium runtime without browser chrome. The
Chrome promotional tiles are not required AMO listing assets.

| Screenshot | Caption |
| --- | --- |
| 01 | Choose a field snippet or global reply without leaving your form. |
| 02 | Search, copy, edit, and organize your global snippet library. |
| 03 | Keep separate snippets for a particular page and field. |
| 04 | Use dark mode, light mode, or your system appearance. |

## Validation

See `store/VERIFICATION.md` for actual test coverage. Mozilla's local validator
reports zero errors, two warnings in bundled React DOM about innerHTML, and
one Android compatibility warning. The reviewer notes explain these; they
are not suppressed. AMO performs its own validation on upload.

Official references:
[submission guide](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/),
[source requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/),
[data declarations](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/),
and [screenshot guidance](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/).
