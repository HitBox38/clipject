import { useCallback, useEffect, useRef, useState } from "react";
import {
  PICKER_GAP,
  PICKER_MAX_HEIGHT,
  PICKER_WIDTH,
  VIEWPORT_PADDING,
} from "../constants";

interface Position {
  top: number;
  left: number;
}

/**
 * Anchors the picker below (or above) the target input and keeps it
 * positioned on scroll / resize.  Returns `null` when the input scrolls
 * out of the viewport so the caller can close the picker.
 */
export function usePickerPosition(
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  onOutOfView: () => void,
) {
  const [position, setPosition] = useState<Position | null>(null);
  const rafId = useRef(0);

  const recalc = useCallback(() => {
    const rect = inputEl.getBoundingClientRect();

    // If the input has been removed or scrolled fully off-screen, bail.
    if (rect.width === 0 && rect.height === 0) {
      onOutOfView();
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Decide vertical placement: prefer below, flip above if not enough room.
    const spaceBelow = vh - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const fitsBelow = spaceBelow >= PICKER_MAX_HEIGHT;

    let top: number;
    if (fitsBelow) {
      top = rect.bottom + PICKER_GAP;
    } else if (spaceAbove >= PICKER_MAX_HEIGHT) {
      top = rect.top - PICKER_GAP - PICKER_MAX_HEIGHT;
    } else {
      // Neither side has full room — pick whichever is bigger.
      top =
        spaceBelow >= spaceAbove
          ? rect.bottom + PICKER_GAP
          : rect.top - PICKER_GAP - Math.min(PICKER_MAX_HEIGHT, spaceAbove);
    }

    // Horizontal: left-align with the input, but don't overflow the viewport.
    let left = rect.left;
    if (left + PICKER_WIDTH > vw - VIEWPORT_PADDING) {
      left = vw - PICKER_WIDTH - VIEWPORT_PADDING;
    }
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }

    setPosition({ top, left });
  }, [inputEl, onOutOfView]);

  useEffect(() => {
    // Initial calculation.
    recalc();

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(recalc);
    };

    window.addEventListener("scroll", onScrollOrResize, { capture: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", onScrollOrResize, { capture: true });
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [recalc]);

  return position;
}
