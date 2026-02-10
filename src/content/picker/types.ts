import type {
  GlobalSnippet,
  InputMeta,
  PageMeta,
  Snippet,
} from "@/types/storage";

export interface PickerProps {
  inputEl: HTMLInputElement | HTMLTextAreaElement;
  compositeKey: string;
  pageMeta: PageMeta;
  inputMeta: InputMeta;
  onClose: () => void;
}

export interface SnippetItemData {
  snippet: Snippet | GlobalSnippet;
  scope: "input" | "global";
}
