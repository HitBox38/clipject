# Chrome Web Store submission — ClipJect

Prepared September 23, 2026 for version 1.0.0. Not submitted or published.
Start with [the upload guide](store/README.md).

## Upload and listing fields

| Dashboard field | Value / file |
| --- | --- |
| Package | `release/1.0.0/clipject-1.0.0-chrome.zip` |
| Name | ClipJect |
| Summary | Save reusable text and paste it into fields you choose. Keep snippets for a specific field or use them across websites. |
| Detailed description | Copy `store/listing-description.txt` |
| Primary language | English |
| Category | Productivity; choose Tools if offered as a subcategory |
| Publisher | Tomer Norman (match your existing publisher account) |
| Support URL | `https://github.com/HitBox38/clipject/issues` |
| Homepage | `https://github.com/HitBox38/clipject` |
| Price | Free |
| Suggested visibility / regions | Public / All regions |

Use your existing verified account email wherever the dashboard requires a
publisher contact. No separate support mailbox was created. Complete any
account-specific trader/contact declarations using your own details.

## Single purpose

Save reusable text and insert it into user-selected webpage fields, with a
local library of field-specific and global snippets.

## Permission justifications

Paste each explanation into its corresponding dashboard field.

| Permission | Justification |
| --- | --- |
| storage | Save snippets, labels, timestamps, selected-field identifiers, associated page details, and appearance/enabled preferences in local browser storage. This provides the snippet library without a server or cloud synchronization. |
| activeTab | Access the active tab after the user invokes ClipJect from the toolbar so they can choose which field to use with snippets. This supports explicit field selection on the page they are using. |
| scripting | Inject ClipJect's packaged content script into the active tab when field selection is requested and the already-open page does not yet have a responding content script. Only bundled extension code is injected. |
| Site access / content-script match on all URLs | Recognize previously selected text fields and show their saved snippets across websites chosen by the user, including after reloads. Restricting this to a fixed domain would prevent the cross-site snippet feature. The picker opens only for registered fields or fields with snippets; password fields are excluded. Page/field metadata is processed locally. |

Broad site access comes from content-script matches, not a separate
`host_permissions` field. Explain it if the dashboard groups it under host
permissions. No tabs, clipboard-read, or history permission is requested.

## Remote code

Select **No, I am not using remote code.** All JavaScript, CSS, and fonts ship
inside the package. Dynamic imports load packaged extension assets only.

## Privacy disclosures

Disclose **Website content** (explicitly saved form text and field identifiers)
and **Web history** (associated page origin, path, and title used for matching
selected fields, not a general history log). These are processed locally and
are not uploaded. Do not select a blanket no-user-data answer simply because
the extension is offline: Chrome's policy covers local processing and storage.

Users can save arbitrary text containing personal information, health or
financial information, communications, addresses, or other sensitive details.
ClipJect does not separately extract these categories, read credentials,
track geolocation, record keystrokes, or monitor clicks for analytics.
If the dashboard asks about categories users may explicitly provide, include
the relevant categories and retain this local-use explanation.

The implementation supports all three limited-use certifications:

- User data is not sold to third parties.
- User data is not used or transferred for purposes unrelated to ClipJect's
  single purpose.
- User data is not used or transferred for creditworthiness or lending.

Read and check the actual certifications in the dashboard. Full retention,
copy/export, website insertion, and deletion details are in [PRIVACY.md](PRIVACY.md).

## Privacy policy URL

The approved policy is in this release and will be public on this repository's
main branch after the approved push:

`https://github.com/HitBox38/clipject/blob/main/PRIVACY.md`

Verify the policy URL opens while signed out after the push. The support URL
responded publicly during preparation.

## Images

All files are in `store/assets/`. Numbered screenshots are 1280 × 800 PNGs
captured from the real extension using sample content, without browser chrome.

| Dashboard slot | File |
| --- | --- |
| Icon, 128 × 128 | `icon-128.png` |
| Screenshot 1 | `01-snippet-picker-1280x800.png` |
| Screenshot 2 | `02-global-library-1280x800.png` |
| Screenshot 3 | `03-field-library-1280x800.png` |
| Screenshot 4 | `04-dark-library-1280x800.png` |
| Small promotional tile, 440 × 280 | `promo-small-440x280.png` |
| Optional marquee, 1400 × 560 | `promo-marquee-1400x560.png` |

Use `store/reviewer-notes.txt` for test instructions if a field is offered.
Do not upload the source archive as the Chrome extension package.

## Version history

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-23 | First store candidate: field picker, global and field libraries, editing, search, keyboard controls, themes, backup/share/clone, and data deletion. | Prepared, not submitted |

If 1.0.0 already exists in your dashboard, increment both `manifest.json` and
`package.json` and rebuild before uploading.

Requirements checked against the official
[listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing),
[privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy),
and [local-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
