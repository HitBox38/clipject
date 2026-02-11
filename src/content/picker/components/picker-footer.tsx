interface Props {
  onSaveCurrentValue: () => void;
  onAddNew: () => void;
  hasCurrentValue: boolean;
}

/**
 * Footer bar with shadcn-styled action buttons.
 */
export function PickerFooter({
  onSaveCurrentValue,
  onAddNew,
  hasCurrentValue,
}: Props) {
  return (
    <div className="clipject-footer">
      {hasCurrentValue && (
        <button
          type="button"
          className="cj-btn cj-btn--outline cj-btn--sm"
          onClick={onSaveCurrentValue}
        >
          Save current
        </button>
      )}
      <button
        type="button"
        className="cj-btn cj-btn--default cj-btn--sm"
        onClick={onAddNew}
      >
        + Add new
      </button>
    </div>
  );
}
