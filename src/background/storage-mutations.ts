import { ext } from "@/lib/ext";
import * as storage from "@/lib/storage";
import { enableStorageWriter } from "@/lib/storage-messaging";
import type { StorageMutationRequest } from "@/lib/storage-messaging";

const mutations = {
  saveInputSnippet: storage.saveInputSnippet,
  deleteInputSnippet: storage.deleteInputSnippet,
  updateInputSnippet: storage.updateInputSnippet,
  deleteInputEntry: storage.deleteInputEntry,
  saveGlobalSnippet: storage.saveGlobalSnippet,
  deleteGlobalSnippet: storage.deleteGlobalSnippet,
  updateGlobalSnippet: storage.updateGlobalSnippet,
  setEnabled: storage.setEnabled,
  setTheme: storage.setTheme,
  addTrackedInput: storage.addTrackedInput,
  removeTrackedInput: storage.removeTrackedInput,
  clearAllData: storage.clearAllData,
  importAllData: storage.importAllData,
  cloneInputEntry: storage.cloneInputEntry,
};

export function initStorageMutations(): void {
  enableStorageWriter();
  let pending: Promise<unknown> = Promise.resolve();

  ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "CLIPJECT_STORAGE_MUTATION") return false;
    if (
      sender.id !== ext.runtime.id ||
      !Object.hasOwn(mutations, message.operation) ||
      !Array.isArray(message.args)
    ) {
      sendResponse({ ok: false, error: "Invalid storage mutation request." });
      return false;
    }

    const request = message as StorageMutationRequest;
    const result = pending.then(() =>
      Reflect.apply(mutations[request.operation], undefined, request.args),
    );
    // A rejected write must not prevent later requests from being processed.
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    void result.then(
      (value: unknown) => sendResponse({ ok: true, value }),
      (error: unknown) =>
        sendResponse({
          ok: false,
          error:
            error instanceof Error ? error.message : "Storage write failed.",
        }),
    );
    // Keep the response channel open until this queued mutation finishes.
    return true;
  });
}
