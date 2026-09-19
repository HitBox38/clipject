interface Props {
  onSaveCurrentValue: () => void;
  onAddNew: () => void;
}

/**
 * Footer bar with shadcn-styled action buttons.
 */
export const PickerFooter = ({ onSaveCurrentValue, onAddNew }: Props) => {
  return (
    <div className="clipject-footer">
      <button
        type="button"
        className="cj-btn cj-btn--outline cj-btn--sm"
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
