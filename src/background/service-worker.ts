/**
 * Background service worker.
 *
 * Responsibilities:
 *  - Set defaults on install
 *  - Future: run storage migrations on update
 *  - Future: message routing between content scripts and popup/options
 */

import { ext } from "@/lib/ext";
import { STORAGE_KEY_ENABLED } from "@/lib/constants";

ext.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[ClipJect] Extension installed — setting defaults.");
    // Ensure the enabled flag exists with a default of `true`.
    void ext.storage.local.get(STORAGE_KEY_ENABLED).then((result) => {
      if (result[STORAGE_KEY_ENABLED] === undefined) {
        void ext.storage.local.set({ [STORAGE_KEY_ENABLED]: true });
      }
    });
  }

  if (details.reason === "update") {
    const version = ext.runtime.getManifest().version;
    console.log(`[ClipJect] Extension updated to v${version}.`);
    // Future: run storage schema migrations here.
  }
});
