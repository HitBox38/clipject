# Chrome Web Store listing — ClipJect

Last updated: 2026-09-23. Draft only; no store submission made.

## Store listing

- Extension name: ClipJect
- Short description: Save and paste snippets into any input field, scoped per page or globally.
- Category: Productivity
- Single purpose: Save reusable text and insert it into user-selected webpage fields.
- Primary language: English

### Detailed description draft

Keep frequently used text on hand with ClipJect. Select a text field on a webpage, save a snippet, and insert it with a click the next time you need it.

Keep global snippets for use across selected fields, or save text for one particular field and page. Search your library, edit labels and text, preview long snippets, and choose light, dark, or system appearance. Export a backup, restore it later, or explicitly copy a snippet's share code.

Open ClipJect and choose Select a field to get started. Password fields are excluded. Saved snippets stay on your device; ClipJect does not send them to a server.

Support contact: pending publisher details.

## Graphics & assets

| Asset             | Status                    | Location                                                                  |
| ----------------- | ------------------------- | ------------------------------------------------------------------------- |
| 128 × 128 icon    | Existing                  | public/icons/icon128.png                                                  |
| Toolbar icons     | Existing                  | public/icons/icon16.png, public/icons/icon48.png                          |
| Store screenshots | Refresh before submission | Show the revised popup, picker, library, and settings at store dimensions |
| Promotional tiles | Not prepared              | —                                                                         |

Local verification captures are in the ignored .tmp-ui directory. These are review artifacts, not prepared store uploads.

## Permissions justification

| Permission or match            | Purpose                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| storage                        | Keep snippets, selected fields, and preferences on the user's device.                 |
| activeTab                      | Access the current page when the user invokes ClipJect to select a field.             |
| scripting                      | Start field selection on an already-open page when its content script is unavailable. |
| Content-script match: all URLs | Make saved snippets available on user-selected fields across websites.                |

This UI update adds no permissions, remote assets, or network services.

## Privacy & data use

The extension stores text the user explicitly saves, labels, timestamps, selected-field identifiers, and associated page origin, path, and title locally. User-entered text may contain personal or sensitive information. It does not upload this data or include analytics. Export writes a local backup; Share copies a code to the clipboard only after an explicit action. Delete all data removes snippets and selected fields while keeping appearance and enabled preferences.

Store disclosure answers and publisher certification must be finalized by the publisher before submission.

## Privacy policy

Public policy URL: not provided. Required before submission.

## Distribution & developer info

Publisher name, public support contact, homepage, visibility, and distribution regions: not configured in this draft.

## Version history

| Version            | Date       | Changes                                                                                                                                 | Status                                       |
| ------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 0.1.0 working tree | 2026-09-23 | Refresh all UI surfaces; compact table-style library, direct copy, library search, expanded previews, save feedback, responsive layout, and keyboard fixes. | Unreleased draft; manifest version unchanged |

## Review notes

Browser-controlled pages do not permit field selection. Complex contenteditable editors are outside the supported field set. Firefox validation and store submission are not part of this change.
