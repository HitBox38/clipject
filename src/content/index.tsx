/**
 * Content script entrypoint.
 * Injected into every page to detect input focus and display the snippet picker.
 *
 * The `__clipjectInitialised` flag prevents double-initialisation when the
 * popup programmatically injects the script into a tab that already has it
 * (e.g. after an HMR reload or extension update).
 */

import { initObserver } from "./observer";

declare global {
  interface Window {
    __clipjectInitialised?: boolean;
  }
}

const protocol = window.location.protocol;
if (
  protocol !== "chrome:" &&
  protocol !== "chrome-extension:" &&
  !window.__clipjectInitialised
) {
  window.__clipjectInitialised = true;
  initObserver();
}
