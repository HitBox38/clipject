/**
 * Content script entrypoint.
 * Injected into every page to detect input focus and display the snippet picker.
 */

import { initObserver } from "./observer";

// Guard: do nothing on restricted pages
const protocol = window.location.protocol;
if (protocol !== "chrome:" && protocol !== "chrome-extension:") {
  initObserver();
}
