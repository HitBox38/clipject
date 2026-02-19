interface Props {
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Thin drag-handle at the bottom of the picker.
 * Renders a subtle grip indicator that becomes more visible on hover.
 */
export const ResizeHandle = ({ onMouseDown }: Props) => {
  return (
    <div
      className="clipject-resize-handle"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize picker"
    />
  );
}
