import type { InputEntry } from "@/types/storage";

export interface PageGroup {
  pageKey: string;
  pageLabel: string;
  entries: [string, InputEntry][];
}
