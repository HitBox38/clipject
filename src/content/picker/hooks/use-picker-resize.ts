import { useCallback, useRef, useState } from "react";
import { PICKER_MAX_HEIGHT, PICKER_MIN_HEIGHT } from "../constants";

interface UsePickerResizeResult {
  maxHeight: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Manages a user-draggable max-height for the picker.
 *
 * On mousedown on the resize handle, attaches document-level
 * mousemove / mouseup listeners to track the drag delta and
 * clamp the resulting height between PICKER_MIN_HEIGHT and the
 * available viewport space.
 */
export function usePickerResize(): UsePickerResizeResult {
  const [maxHeight, setMaxHeight] = useState(PICKER_MAX_HEIGHT);

  // Keep a ref in sync so the stable callback always reads the
  // latest value without re-creating itself.
  const maxHeightRef = useRef(maxHeight);
  maxHeightRef.current = maxHeight;

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const startY = e.clientY;
    const startHeight = maxHeightRef.current;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = moveEvt.clientY - startY;
      const viewportMax = window.innerHeight - 40;
      const next = Math.min(
        viewportMax,
        Math.max(PICKER_MIN_HEIGHT, startHeight + delta),
      );
      setMaxHeight(next);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  return { maxHeight, onResizeStart };
}
