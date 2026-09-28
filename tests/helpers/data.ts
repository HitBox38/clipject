import type {
  ClipjectExportPayload,
  InputMeta,
  PageMeta,
  Snippet,
} from "@/types/storage";

export const snippet = (id: string, value = id): Snippet => ({
  id,
  value,
  createdAt: 1,
  updatedAt: 1,
});
export const page: PageMeta = {
  origin: "https://source.example",
  pathname: "/form",
  titleLastSeen: "Source",
};
export const input: InputMeta = {
  signature: "id:notes",
  tag: "textarea",
  lastSeenAt: 1,
};
export const payload = (
  data: Partial<ClipjectExportPayload["data"]> = {},
): ClipjectExportPayload => ({
  source: "clipject",
  version: 1,
  exportedAt: 1,
  data: { globalSnippets: [], perInputDb: {}, trackedInputs: [], ...data },
});
