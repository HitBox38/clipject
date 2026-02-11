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
 * Pure calculation — no React state involved.
 * Given an input element's bounding rect, returns the picker position
 * or `null` when the element is off-screen / removed.
 */
function calcPosition(
  inputEl: HTMLInputElement | HTMLTextAreaElement,
): Position | null {
  const rect = inputEl.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceBelow = vh - rect.bottom - VIEWPORT_PADDING;
  const spaceAbove = rect.top - VIEWPORT_PADDING;
  const fitsBelow = spaceBelow >= PICKER_MAX_HEIGHT;

  let top: number;
  if (fitsBelow) {
    top = rect.bottom + PICKER_GAP;
  } else if (spaceAbove >= PICKER_MAX_HEIGHT) {
    top = rect.top - PICKER_GAP - PICKER_MAX_HEIGHT;
  } else {
    top =
      spaceBelow >= spaceAbove
        ? rect.bottom + PICKER_GAP
        : rect.top - PICKER_GAP - Math.min(PICKER_MAX_HEIGHT, spaceAbove);
  }

  let left = rect.left;
  if (left + PICKER_WIDTH > vw - VIEWPORT_PADDING) {
    left = vw - PICKER_WIDTH - VIEWPORT_PADDING;
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  return { top, left };
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
  // Compute initial position eagerly so we never need a synchronous
  // setState inside an effect (React 19 flags that as a cascading render).
  const [position, setPosition] = useState<Position | null>(() =>
    calcPosition(inputEl),
  );
  const rafId = useRef(0);

  const recalc = useCallback(() => {
    const next = calcPosition(inputEl);
    if (next === null) {
      onOutOfView();
      return;
    }
    setPosition(next);
  }, [inputEl, onOutOfView]);

  useEffect(() => {
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
