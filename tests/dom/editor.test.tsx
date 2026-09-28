import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { input, page, snippet } from "../helpers/data";
import { storageContexts } from "../helpers/extension";

afterEach(cleanup);
for (const kind of ["global", "input"] as const) {
  async function setup() {
    const h = await storageContexts();
    const saved = { ...snippet("s", "Original"), label: "Old label" };
    if (kind === "global") {
      await h.a.saveGlobalSnippet(saved);
      const { SnippetRow } =
        await import("@/options/global-snippets/components/snippet-row");
      render(
        <SnippetRow
          snippet={saved}
          onEdit={h.a.updateGlobalSnippet}
          onDelete={h.a.deleteGlobalSnippet}
        />,
      );
    } else {
      await h.a.saveInputSnippet("field", page, input, saved);
      const { SnippetEditor } =
        await import("@/options/per-input-snippets/components/snippet-editor");
      render(
        <SnippetEditor
          snippet={saved}
          compositeKey="field"
          onEdit={h.a.updateInputSnippet}
          onDelete={h.a.deleteInputSnippet}
        />,
      );
    }
    const read = async () =>
      kind === "global"
        ? (await h.a.getGlobalSnippets())[0]
        : (await h.a.getInputEntry("field"))?.snippets[0];
    return { ...h, read, user: userEvent.setup() };
  }

  test(`${kind} editor can clear a label and persist edited text`, async () => {
    const h = await setup();
    await h.user.click(screen.getByRole("button", { name: "Edit" }));
    await h.user.clear(screen.getByLabelText("Snippet label"));
    await h.user.type(screen.getByLabelText("Snippet label"), "   ");
    await h.user.clear(screen.getByLabelText("Snippet text"));
    await h.user.type(screen.getByLabelText("Snippet text"), "Edited value");
    await h.user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByLabelText("Snippet text")).not.toBeInTheDocument(),
    );
    expect(await h.read()).toMatchObject({ value: "Edited value", label: "" });
  });

  test(`${kind} editor retains draft after write failure and can retry`, async () => {
    const h = await setup();
    await h.user.click(screen.getByRole("button", { name: "Edit" }));
    await h.user.clear(screen.getByLabelText("Snippet text"));
    await h.user.type(screen.getByLabelText("Snippet text"), "New draft");
    h.failWrites(true);
    await h.user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your draft is still here",
    );
    expect(screen.getByLabelText("Snippet text")).toHaveValue("New draft");
    expect(await h.read()).toMatchObject({ value: "Original" });
    h.failWrites(false);
    await h.user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () =>
      expect(await h.read()).toMatchObject({ value: "New draft" }),
    );
  });

  test(`${kind} deletion requires confirmation and cancel preserves data`, async () => {
    const h = await setup();
    await h.user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await h.read()).toBeDefined();
    await h.user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await h.read()).toBeDefined();
    await h.user.click(screen.getByRole("button", { name: "Delete" }));
    await h.user.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await h.read()).toBeUndefined();
  });
}
