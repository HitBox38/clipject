import { vi } from "vitest";

type Data = Record<string, unknown>;
type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
) => void;
type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (response: unknown) => void,
) => boolean | void;

function event<T extends (...args: never[]) => unknown>() {
  const listeners = new Set<T>();
  return {
    addListener: (listener: T) => {
      listeners.add(listener);
    },
    removeListener: (listener: T) => {
      listeners.delete(listener);
    },
    hasListener: (listener: T) => listeners.has(listener),
    listeners,
  };
}

/** Only the API surface used by ClipJect. No mock of application logic. */
export function extensionHarness() {
  let data: Data = {};
  let fail = false;
  const onChanged = event<StorageListener>();
  const onMessage = event<MessageListener>();
  const notify = (before: Data, after: Data) => {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = { oldValue: before[key], newValue: after[key] };
      }
    }
    if (Object.keys(changes).length) {
      for (const listener of onChanged.listeners)
        listener(structuredClone(changes), "local");
    }
  };
  const local = {
    get: vi.fn(
      async (keys?: string | string[] | Data | null): Promise<Data> => {
        if (keys == null) return structuredClone(data);
        const requested =
          typeof keys === "string"
            ? [keys]
            : Array.isArray(keys)
              ? keys
              : Object.keys(keys);
        return structuredClone(
          Object.fromEntries(
            requested.map((key) => [
              key,
              data[key] ??
                (typeof keys === "object" && !Array.isArray(keys)
                  ? keys[key]
                  : undefined),
            ]),
          ),
        );
      },
    ),
    set: vi.fn(async (values: Data) => {
      if (fail) throw new Error("QUOTA_BYTES");
      const before = structuredClone(data);
      Object.assign(data, structuredClone(values));
      notify(before, data);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      if (fail) throw new Error("QUOTA_BYTES");
      const before = structuredClone(data);
      for (const key of typeof keys === "string" ? [keys] : keys)
        delete data[key];
      notify(before, data);
    }),
  };
  const runtime = {
    id: "clipject-test",
    onMessage,
    sendMessage: vi.fn(async (message: unknown) => {
      return new Promise<unknown>((resolve, reject) => {
        let pending = false;
        let responded = false;
        for (const listener of onMessage.listeners) {
          const keepOpen = listener(
            structuredClone(message),
            { id: "clipject-test" },
            (response) => {
              responded = true;
              resolve(structuredClone(response));
            },
          );
          pending ||= keepOpen === true;
        }
        if (!pending && !responded)
          reject(new Error("The storage worker did not respond."));
      });
    }),
  };
  const api = { storage: { local, onChanged }, runtime };
  vi.stubGlobal("chrome", api);
  return {
    api,
    seed: (value: Data) => {
      data = structuredClone(value);
    },
    read: () => structuredClone(data),
    failWrites: (value: boolean) => {
      fail = value;
    },
  };
}

/** Fresh module graphs model the worker and two independent extension clients. */
export async function storageContexts() {
  vi.resetModules();
  const harness = extensionHarness();
  const worker = await import("@/background/storage-mutations");
  worker.initStorageMutations();
  vi.resetModules();
  const a = await import("@/lib/storage");
  vi.resetModules();
  const b = await import("@/lib/storage");
  return { ...harness, a, b };
}
