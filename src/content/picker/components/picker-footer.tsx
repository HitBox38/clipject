interface Props {
  onSaveCurrentValue: () => void;
  onAddNew: () => void;
  hasCurrentValue: boolean;
}

/**
 * Footer bar with "Save current value" and "Add new" buttons.
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
          className="clipject-footer-btn"
          onClick={onSaveCurrentValue}
        >
          Save current value
        </button>
      )}
      <button
        type="button"
        className="clipject-footer-btn primary"
        onClick={onAddNew}
      >
        + Add new
      </button>
    </div>
  );
}
