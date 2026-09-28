import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  STORAGE_KEY_GLOBAL_SNIPPETS,
  STORAGE_KEY_TRACKED_INPUTS,
} from "../../src/lib/constants";

export const origin = "http://127.0.0.1:4173";
type Extension = {
  context: BrowserContext;
  worker: Worker;
  id: string;
  options: Page;
};

export const test = base.extend<{ extension: Extension }>({
  extension: async ({ headless }, use, info) => {
    const profile = await mkdtemp(path.join(tmpdir(), "clipject-test-"));
    const extensionPath = path.resolve("dist");
    let context: BrowserContext | undefined;
    let tracing = false;
    try {
      context = await chromium.launchPersistentContext(profile, {
        channel: "chromium",
        headless,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      });
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      tracing = true;
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));
      const id = new URL(worker.url()).host;
      const options = await context.newPage();
      await options.goto(`chrome-extension://${id}/src/options/index.html`);
      await expect(
        options.getByRole("heading", { name: "Global snippets", exact: true }),
      ).toBeVisible();
      await use({ context, worker, id, options });
    } finally {
      try {
        if (context && tracing && info.status !== info.expectedStatus) {
          const trace = info.outputPath("trace.zip");
          await context.tracing.stop({ path: trace });
          await info.attach("trace", {
            path: trace,
            contentType: "application/zip",
          });
          for (const [index, page] of context.pages().entries()) {
            if (page.isClosed()) continue;
            const screenshot = info.outputPath(`page-${index}.png`);
            await page.screenshot({ path: screenshot });
            await info.attach(`page-${index}`, {
              path: screenshot,
              contentType: "image/png",
            });
          }
        } else if (context && tracing) {
          await context.tracing.stop();
        }
      } finally {
        try {
          await context?.close();
        } finally {
          await rm(profile, { recursive: true, force: true });
        }
      }
    }
  },
  page: async ({ extension }, use) => {
    const page = await extension.context.newPage();
    await page.goto(origin);
    await use(page);
  },
});
export { expect };

/** Seeds only prerequisite data; assertions exercise the actual built extension. */
export async function seed(
  extension: Extension,
  fields = ["id:notes"],
  globalValues = ["Global greeting"],
) {
  await extension.options.evaluate(
    async ({ origin, fields, globalValues, globalKey, trackedKey }) => {
      await chrome.storage.local.set({
        [globalKey]: globalValues.map((value, index) => ({
          id: `global-${index}`,
          value,
          createdAt: 1,
          updatedAt: 1,
        })),
        [trackedKey]: fields.map((inputSignature) => ({
          origin,
          pathname: "/",
          inputSignature,
          registeredAt: 1,
        })),
      });
    },
    {
      origin,
      fields,
      globalValues,
      globalKey: STORAGE_KEY_GLOBAL_SNIPPETS,
      trackedKey: STORAGE_KEY_TRACKED_INPUTS,
    },
  );
}

export async function startSelection(extension: Extension, page: Page) {
  await page.bringToFront();
  // Same message as the popup; toolbar chrome itself is outside Playwright's DOM.
  await expect(async () => {
    await extension.worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab.id === undefined) throw new Error("No active test tab");
      await chrome.tabs.sendMessage(tab.id, {
        type: "CLIPJECT_START_ELEMENT_SELECTION",
      });
    });
  }).toPass({ timeout: 5_000 });
  await expect(
    page.getByRole("button", { name: "Cancel (Esc)" }),
  ).toBeVisible();
}

export const picker = (page: Page) =>
  page.getByRole("dialog", { name: "ClipJect snippet picker" });
export async function openPicker(page: Page, label = "Notes") {
  const field = page.getByLabel(label, { exact: true });
  // Content-script injection and storage hydration can finish after page load.
  // Retry the focus action until the real picker confirms readiness.
  await expect(async () => {
    await field.blur();
    await field.focus();
    await expect(picker(page)).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 5_000 });
  return field;
}
