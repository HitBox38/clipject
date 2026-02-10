/**
 * Element-selection mode for registering inputs to be tracked by ClipJect.
 *
 * When activated (from the popup), the user sees:
 *  - A top banner: "Click an input to track it. Press Esc to cancel."
 *  - Supported inputs highlighted on hover
 *  - Click an input -> register it in storage -> show confirmation flash
 *  - Esc / clicking the banner "X" -> cancel
 */

import { computeInputSignature, isSupportedField, isPasswordField } from "@/lib/keys";
import { addTrackedInput } from "@/lib/storage";
import { PICKER_Z_INDEX } from "@/lib/constants";

let active = false;
let banner: HTMLDivElement | null = null;
let currentHighlight: HTMLElement | null = null;

const HIGHLIGHT_OUTLINE = "2px solid #33a89e";
const HIGHLIGHT_OUTLINE_OFFSET = "1px";
const FLASH_BG = "rgba(51, 168, 158, 0.25)";
const BANNER_HEIGHT = "40px";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startElementSelector(): void {
  if (active) return;
  active = true;

  createBanner();
  document.addEventListener("mouseover", handleMouseOver, { capture: true });
  document.addEventListener("mouseout", handleMouseOut, { capture: true });
  document.addEventListener("click", handleClick, { capture: true });
  document.addEventListener("keydown", handleKeyDown, { capture: true });
}

export function stopElementSelector(): void {
  if (!active) return;
  active = false;

  clearHighlight();
  removeBanner();
  document.removeEventListener("mouseover", handleMouseOver, { capture: true });
  document.removeEventListener("mouseout", handleMouseOut, { capture: true });
  document.removeEventListener("click", handleClick, { capture: true });
  document.removeEventListener("keydown", handleKeyDown, { capture: true });
}

export function isElementSelectorActive(): boolean {
  return active;
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function createBanner(): void {
  banner = document.createElement("div");
  banner.id = "clipject-selector-banner";

  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    height: BANNER_HEIGHT,
    zIndex: String(PICKER_Z_INDEX),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "#33a89e",
    color: "#fff",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    pointerEvents: "auto",
  } satisfies Partial<Record<keyof CSSStyleDeclaration, string>>);

  const label = document.createElement("span");
  label.textContent = "Click an input to track it with ClipJect.";
  banner.appendChild(label);

  const cancelBtn = document.createElement("button");
  Object.assign(cancelBtn.style, {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: "4px",
    color: "#fff",
    padding: "3px 10px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "500",
  });
  cancelBtn.textContent = "Cancel (Esc)";
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    stopElementSelector();
  });
  banner.appendChild(cancelBtn);

  document.body.appendChild(banner);
}

function removeBanner(): void {
  if (banner) {
    banner.remove();
    banner = null;
  }
}

// ---------------------------------------------------------------------------
// Highlight helpers
// ---------------------------------------------------------------------------

function highlightElement(el: HTMLElement): void {
  if (currentHighlight === el) return;
  clearHighlight();
  currentHighlight = el;
  el.dataset.clipjectPrevOutline = el.style.outline;
  el.dataset.clipjectPrevOutlineOffset = el.style.outlineOffset;
  el.style.outline = HIGHLIGHT_OUTLINE;
  el.style.outlineOffset = HIGHLIGHT_OUTLINE_OFFSET;
}

function clearHighlight(): void {
  if (!currentHighlight) return;
  currentHighlight.style.outline =
    currentHighlight.dataset.clipjectPrevOutline ?? "";
  currentHighlight.style.outlineOffset =
    currentHighlight.dataset.clipjectPrevOutlineOffset ?? "";
  delete currentHighlight.dataset.clipjectPrevOutline;
  delete currentHighlight.dataset.clipjectPrevOutlineOffset;
  currentHighlight = null;
}

/** Brief green flash to confirm the input was registered. */
function flashConfirmation(el: HTMLElement): void {
  const prevBg = el.style.background;
  el.style.background = FLASH_BG;
  setTimeout(() => {
    el.style.background = prevBg;
  }, 400);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function handleMouseOver(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!isSupportedField(target)) return;
  if (isPasswordField(target)) return;
  highlightElement(target);
}

function handleMouseOut(event: MouseEvent): void {
  const target = event.target;
  if (target === currentHighlight) {
    clearHighlight();
  }
}

function handleClick(event: MouseEvent): void {
  // Prevent normal click behavior while in selection mode.
  event.preventDefault();
  event.stopPropagation();

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  // Ignore clicks on the banner itself (handled separately).
  if (banner?.contains(target)) return;

  if (!isSupportedField(target)) return;
  if (isPasswordField(target)) return;

  void registerInput(target as HTMLInputElement | HTMLTextAreaElement);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    stopElementSelector();
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

async function registerInput(
  el: HTMLInputElement | HTMLTextAreaElement,
): Promise<void> {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const inputSignature = computeInputSignature(el);

  await addTrackedInput({
    origin,
    pathname,
    inputSignature,
    registeredAt: Date.now(),
  });

  clearHighlight();
  flashConfirmation(el);

  // Small delay so the user sees the flash before banner disappears.
  setTimeout(() => {
    stopElementSelector();
  }, 300);
}
