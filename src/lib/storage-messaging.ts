import { ext } from "./ext";
import type * as Storage from "./storage";

type MutationName =
  | "saveInputSnippet"
  | "deleteInputSnippet"
  | "updateInputSnippet"
  | "deleteInputEntry"
  | "saveGlobalSnippet"
  | "deleteGlobalSnippet"
  | "updateGlobalSnippet"
  | "setEnabled"
  | "setTheme"
  | "addTrackedInput"
  | "removeTrackedInput"
  | "clearAllData"
  | "importAllData"
  | "cloneInputEntry";

type MutationFunctions = Pick<typeof Storage, MutationName>;
export type StorageMutationRequest = {
  [K in MutationName]: {
    type: "CLIPJECT_STORAGE_MUTATION";
    operation: K;
    args: Parameters<MutationFunctions[K]>;
  };
}[MutationName];

type MutationResult<K extends MutationName> = Awaited<
  ReturnType<MutationFunctions[K]>
>;

type StorageMutationResponse<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// Only the background worker enables direct mutation. Every other context
// sends requests to that worker, including Options and content scripts.
let storageWriter = false;
export const enableStorageWriter = (): void => {
  storageWriter = true;
};
export const isStorageWriter = (): boolean => storageWriter;

export async function requestStorageMutation<K extends MutationName>(
  operation: K,
  args: Parameters<MutationFunctions[K]>,
): Promise<MutationResult<K>> {
  const response = (await ext.runtime.sendMessage({
    type: "CLIPJECT_STORAGE_MUTATION",
    operation,
    args,
  })) as StorageMutationResponse<MutationResult<K>> | undefined;

  if (!response?.ok) {
    throw new Error(response?.error ?? "The storage worker did not respond.");
  }
  return response.value;
}
