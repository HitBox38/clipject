import {
  test,
  expect,
  seed,
  startSelection,
  openPicker,
  picker,
} from "./extension";
import {
  STORAGE_KEY_GLOBAL_SNIPPETS,
  STORAGE_KEY_PER_INPUT_DB,
  STORAGE_KEY_TRACKED_INPUTS,
} from "../../src/lib/constants";

test("select, save, insert and reload preserve field snippets and event delivery", async ({
  extension,
  page,
}) => {
  await startSelection(extension, page);
  await page.getByLabel("Notes", { exact: true }).click();
  await expect(picker(page)).toBeVisible();
  const field = page.getByLabel("Notes", { exact: true });
  await field.fill("Synthetic field note");
  await picker(page).getByRole("button", { name: "Save current" }).click();
  await expect(picker(page).getByRole("status")).toHaveText(
    "Saved for this field.",
  );
  await field.fill("");
  await page.evaluate(() => {
    const field = document.querySelector("#notes")!;
    for (const name of ["input", "change"])
      field.addEventListener(name, () =>
        field.setAttribute(`data-${name}`, "received"),
      );
  });
  await picker(page)
    .getByRole("button", { name: "Synthetic field note", exact: true })
    .click();
  await expect(field).toHaveValue("Synthetic field note");
  await expect(field).toHaveAttribute("data-input", "received");
  await expect(field).toHaveAttribute("data-change", "received");
  await page.reload();
  await openPicker(page);
  await expect(
    picker(page).getByRole("button", {
      name: "Synthetic field note",
      exact: true,
    }),
  ).toBeVisible();
});

test("global creation, filtering and field-first order work across pages", async ({
  extension,
  page,
}) => {
  await seed(extension, ["id:notes", "id:other"], []);
  await page.reload();
  const field = await openPicker(page);
  await field.fill("Field note");
  await picker(page).getByRole("button", { name: "Save current" }).click();
  await expect(
    picker(page).getByRole("button", { name: "Field note", exact: true }),
  ).toBeVisible();
  await picker(page)
    .getByRole("button", { name: /Add new/ })
    .click();
  await picker(page).getByLabel("Snippet text").fill("Global note");
  await picker(page)
    .getByRole("button", { name: "Global", exact: true })
    .click();
  await picker(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(picker(page).locator(".clipject-item")).toHaveText([
    "Field note",
    "Global note",
  ]);
  await picker(page).getByRole("searchbox").fill("Global");
  await expect(picker(page).locator(".clipject-item")).toHaveText([
    "Global note",
  ]);
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("Global note");
  await page.goto("http://localhost:4173/");
  await startSelection(extension, page);
  await page.getByLabel("Notes", { exact: true }).click();
  await expect(picker(page).locator(".clipject-item")).toHaveText([
    "Global note",
  ]);
});

test("options create, edit, clear labels, delete and delete-all persist", async ({
  extension,
  page,
}) => {
  const options = extension.options;
  await options.getByRole("button", { name: /New snippet/ }).click();
  await options.getByLabel("Label (optional)").fill("Greeting");
  await options.getByLabel("Snippet text").fill("Original global");
  await options.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    options.getByText("Original global", { exact: true }),
  ).toBeVisible();
  await options.getByRole("button", { name: "Edit", exact: true }).click();
  await options.getByLabel("Snippet label").fill("");
  await options.getByLabel("Snippet text").fill("Edited global");
  await options.getByRole("button", { name: "Save", exact: true }).click();
  await options.reload();
  await expect(
    options.getByText("Edited global", { exact: true }),
  ).toBeVisible();
  await expect(options.getByText("Untitled", { exact: true })).toBeVisible();
  await options.getByRole("button", { name: "Delete", exact: true }).click();
  await options.getByRole("button", { name: "Confirm delete" }).click();
  await expect(options.getByText("Edited global", { exact: true })).toHaveCount(
    0,
  );

  await startSelection(extension, page);
  await page.getByLabel("Notes", { exact: true }).click();
  await expect(picker(page)).toBeVisible();
  await page.getByLabel("Notes", { exact: true }).fill("Field original");
  await picker(page).getByRole("button", { name: "Save current" }).click();
  await expect(picker(page).getByRole("status")).toHaveText(
    "Saved for this field.",
  );
  await options.reload();
  await options.getByRole("button", { name: /Field snippets/ }).click();
  await options.getByRole("button", { name: /notes 1 snippet/ }).click();
  await options.getByRole("button", { name: "Edit", exact: true }).click();
  await options.getByLabel("Snippet text").fill("Field edited");
  await options.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    options.getByText("Field edited", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await openPicker(page);
  await expect(
    picker(page).getByRole("button", { name: "Field edited", exact: true }),
  ).toBeVisible();
  await options.getByRole("button", { name: "Settings", exact: true }).click();
  await options
    .getByRole("button", { name: "Delete all", exact: true })
    .click();
  await options
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await options
    .getByRole("button", { name: "Delete all", exact: true })
    .click();
  await options
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete all data" })
    .click();
  await expect(options.getByRole("status")).toHaveText(
    "All snippets and selected fields have been deleted.",
  );
  const data = await options.evaluate(async () =>
    chrome.storage.local.get(null),
  );
  for (const key of [
    STORAGE_KEY_GLOBAL_SNIPPETS,
    STORAGE_KEY_PER_INPUT_DB,
    STORAGE_KEY_TRACKED_INPUTS,
  ])
    expect(data).not.toHaveProperty(key);
});

test("password exclusion and selector cancellation", async ({
  extension,
  page,
}) => {
  await startSelection(extension, page);
  await page.getByLabel("Password", { exact: true }).click();
  await expect(picker(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cancel (Esc)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel (Esc)" }).click();
  await expect(page.locator("#clipject-selector-banner")).toHaveCount(0);
  const tracked = await extension.options.evaluate(
    async (key) => (await chrome.storage.local.get(key))[key],
    STORAGE_KEY_TRACKED_INPUTS,
  );
  expect(tracked ?? []).toEqual([]);
});

test("React state updates on insertion; Escape and focus changes close the picker", async ({
  extension,
  page,
}) => {
  await seed(extension, ["id:react-notes", "id:notes"]);
  await page.reload();
  await openPicker(page, "React notes");
  await picker(page)
    .getByRole("button", { name: "Global greeting", exact: true })
    .click();
  await expect(page.getByTestId("react-state")).toHaveText("Global greeting");
  await expect(page.getByTestId("react-changes")).toHaveText("1");
  await openPicker(page);
  await page.keyboard.press("Escape");
  await expect(picker(page)).toHaveCount(0);
  await openPicker(page);
  await page.getByLabel("Other field", { exact: true }).focus();
  await expect(picker(page)).toHaveCount(0);
});

test("SPA title and path scope field snippets; viewport changes keep picker safe", async ({
  extension,
  page,
}) => {
  await seed(extension);
  await page.reload();
  const field = await openPicker(page);
  await field.fill("Original title note");
  await picker(page).getByRole("button", { name: "Save current" }).click();
  await expect(picker(page).getByRole("status")).toHaveText(
    "Saved for this field.",
  );
  await page.getByRole("button", { name: "Change title" }).click();
  await openPicker(page);
  await expect(picker(page).locator(".clipject-item")).toHaveText([
    "Global greeting",
  ]);
  await page.setViewportSize({ width: 600, height: 700 });
  const bounds = await picker(page).boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(600);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(picker(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Change path" }).click();
  await field.focus();
  await expect(picker(page)).toHaveCount(0);
  await page.goBack();
  await openPicker(page);
});

test("popup toggle persists and disables the content picker", async ({
  extension,
  page,
}) => {
  await seed(extension);
  await page.reload();
  await openPicker(page);
  const popup = await extension.context.newPage();
  await popup.goto(`chrome-extension://${extension.id}/src/popup/index.html`);
  const toggle = popup.getByRole("switch", { name: "Enable ClipJect" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(picker(page)).toHaveCount(0);
  await popup.reload();
  await expect(
    popup.getByRole("switch", { name: "Enable ClipJect" }),
  ).not.toBeChecked();
  await popup.getByRole("switch", { name: "Enable ClipJect" }).click();
  await openPicker(page);
});
