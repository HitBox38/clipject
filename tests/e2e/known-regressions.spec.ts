import { FOCUS_DEBOUNCE_MS } from "../../src/lib/constants";
import { test, expect, seed, openPicker, picker } from "./extension";

// Executable reproductions from the 2026-09-28 QA report. Each expected-failure
// marker is placed AFTER setup succeeds, immediately before the defect assertion.
// Remove the marker when fixing the defect; an unexpected pass fails CI.
test("QA-01: Enter in a page textarea preserves the draft", async ({
  extension,
  page,
}) => {
  await seed(extension);
  await page.reload();
  const field = await openPicker(page);
  await field.fill("Unsaved draft");
  await expect(
    picker(page).getByRole("button", { name: "Global greeting", exact: true }),
  ).toBeVisible();
  await field.press("End");
  await field.press("Enter");
  test.fail(
    true,
    "QA-01: picker currently intercepts Enter before explicit navigation",
  );
  await expect(field).toHaveValue("Unsaved draft\n", { timeout: 1000 });
});

test("QA-02: Undo restores the draft replaced by insertion", async ({
  extension,
  page,
}) => {
  await seed(extension);
  await page.reload();
  const field = await openPicker(page);
  await field.pressSequentially("Unsaved draft");
  await picker(page)
    .getByRole("button", { name: "Global greeting", exact: true })
    .click();
  await expect(field).toHaveValue("Global greeting");
  await field.press("ControlOrMeta+z");
  test.fail(
    true,
    "QA-02: native setter does not preserve browser undo history",
  );
  await expect(field).toHaveValue("Unsaved draft", { timeout: 1000 });
});

test("QA-03: read-only fields do not offer insertion", async ({
  extension,
  page,
}) => {
  await seed(extension, ["id:notes", "id:readonly"]);
  await page.reload();
  await openPicker(page); // Proves the content script has hydrated storage.
  const field = page.getByLabel("Read only", { exact: true });
  await expect(field).toHaveAttribute("readonly", "");
  await field.focus();
  // Negative assertions must run after the content observer's focus debounce.
  await page.evaluate(
    (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
    FOCUS_DEBOUNCE_MS + 50,
  );
  test.fail(
    true,
    "QA-03: supported-field check currently permits readonly inputs",
  );
  await expect(picker(page)).toHaveCount(0, { timeout: 1000 });
});

test("QA-04: repeated field names do not share per-field snippets", async ({
  extension,
  page,
}) => {
  await seed(extension, ["name:item-note"], []);
  await page.reload();
  const first = await openPicker(page, "First item");
  await first.fill("Only first item");
  await picker(page).getByRole("button", { name: "Save current" }).click();
  await expect(picker(page).getByRole("status")).toHaveText(
    "Saved for this field.",
  );
  await page.getByLabel("Second item", { exact: true }).focus();
  await page.evaluate(
    (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
    FOCUS_DEBOUNCE_MS + 50,
  );
  test.fail(true, "QA-04: input name alone collides between sibling fields");
  await expect(
    picker(page).getByRole("button", { name: "Only first item", exact: true }),
  ).toHaveCount(0, { timeout: 1000 });
});

test("QA-05: insertion respects maxlength", async ({ extension, page }) => {
  await seed(extension, ["id:short"]);
  await page.reload();
  const field = await openPicker(page, "Short code");
  await expect(field).toHaveAttribute("maxlength", "5");
  await picker(page)
    .getByRole("button", { name: "Global greeting", exact: true })
    .click();
  test.fail(true, "QA-05: native value setter currently bypasses maxlength");
  expect((await field.inputValue()).length).toBeLessThanOrEqual(5);
});

test("QA-06: picker inside a native modal can receive clicks", async ({
  extension,
  page,
}) => {
  await seed(extension, ["id:modal-notes"]);
  await page.reload();
  await page.getByRole("button", { name: "Open modal", exact: true }).click();
  const field = await openPicker(page, "Modal notes");
  const row = picker(page).getByRole("button", {
    name: "Global greeting",
    exact: true,
  });
  await expect(row).toBeVisible();
  test.fail(
    true,
    "QA-06: picker host currently sits below the native dialog top layer",
  );
  await row.click({ timeout: 1000 });
  await expect(field).toHaveValue("Global greeting");
});
