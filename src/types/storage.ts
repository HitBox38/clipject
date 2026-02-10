/** Single saved snippet (used for both per-input and global). */
export interface Snippet {
  id: string;
  value: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
}

/** Metadata about the page where snippets were saved. */
export interface PageMeta {
  origin: string;
  pathname: string;
  titleLastSeen: string;
}

/** Metadata about the input element a snippet set is bound to. */
export interface InputMeta {
  signature: string;
  tag: "input" | "textarea";
  type?: string;
  lastSeenAt: number;
}

/** One record in the per-input database. */
export interface InputEntry {
  page: PageMeta;
  input: InputMeta;
  snippets: Snippet[];
}

/** Alias — global snippets share the same Snippet shape. */
export type GlobalSnippet = Snippet;

/** Supported theme modes. "system" follows the OS preference. */
export type Theme = "light" | "dark" | "system";

/** Shape of the entire per-input database stored in chrome.storage.local. */
export type PerInputDb = Record<string, InputEntry>;
