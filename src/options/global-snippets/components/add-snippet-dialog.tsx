import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  onAdd: (value: string, label?: string) => Promise<void>;
}

export function AddSnippetDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    setSaving(true);
    await onAdd(trimmedValue, label.trim() || undefined);
    setSaving(false);
    setValue("");
    setLabel("");
    setOpen(false);
  }, [value, label, onAdd]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        + Add global snippet
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="snippet-label">Label (optional)</Label>
        <Input
          id="snippet-label"
          placeholder="e.g. Greeting"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="snippet-value">Snippet text</Label>
        <Textarea
          id="snippet-value"
          placeholder="The text to paste..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setValue("");
            setLabel("");
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!value.trim() || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
