/**
 * A modal makes the rest of the document inert. Its overlays must be descendants
 * of that dialog, then enter the top layer to escape clipping and transforms.
 */
export const placeOverlay = (
  overlay: HTMLElement,
  anchor: Element | null,
  onDismiss: () => void,
): (() => void) => {
  const document = overlay.ownerDocument;
  const modal = anchor?.closest<HTMLDialogElement>("dialog:modal") ?? null;
  const parent = modal ?? document.body;

  // Reset popover defaults without disturbing the overlay's own positioning.
  overlay.style.margin = "0";
  overlay.style.border = "0";
  overlay.style.padding = "0";
  overlay.style.right = "auto";
  overlay.style.bottom = "auto";
  parent.appendChild(overlay);

  if (typeof overlay.showPopover === "function") {
    overlay.popover = "manual";
    overlay.showPopover();
  }

  const checkTarget = () => {
    if (
      !overlay.isConnected ||
      (anchor && !anchor.isConnected) ||
      (modal && (!modal.open || !modal.contains(anchor)))
    ) {
      onDismiss();
    }
  };
  const observer = new MutationObserver(checkTarget);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  modal?.addEventListener("close", onDismiss);

  return () => {
    observer.disconnect();
    modal?.removeEventListener("close", onDismiss);
    // Removing the overlay also removes it from the browser's top layer.
    overlay.remove();
  };
};
