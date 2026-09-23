import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

export function CopySnippetButton({
  value,
  onError,
}: {
  value: string;
  onError: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      onError("");
      setCopied(true);
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      onError("Couldn’t copy this snippet. Please try again.");
    }
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      aria-live="polite"
      onClick={() => void copy()}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
