interface Props {
  saving?: boolean;
  onSaveCurrentValue: () => void;
  onAddNew: () => void;
}

/**
 * Footer bar with shadcn-styled action buttons.
 */
export const PickerFooter = ({
  onSaveCurrentValue,
  onAddNew,
  saving,
}: Props) => {
  return (
    <div className="clipject-footer">
      <button
        type="button"
        className="cj-btn cj-btn--outline cj-btn--sm"
        disabled={saving}
        onClick={onSaveCurrentValue}
      >
        Save current
      </button>
      <button
        type="button"
        className="cj-btn cj-btn--default cj-btn--sm"
        onClick={onAddNew}
      >
        + Add new
      </button>
    </div>
  );
};
