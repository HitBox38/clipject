/**
 * Message types exchanged between extension contexts
 * (popup/background ↔ content scripts).
 */

export interface BaseMessage {
  type: string;
}

export interface PingMessage extends BaseMessage {
  type: "CLIPJECT_PING";
}

export interface PongMessage extends BaseMessage {
  type: "CLIPJECT_PONG";
}

/** Sent from popup to content script to begin element-selection mode. */
export interface StartElementSelectionMessage extends BaseMessage {
  type: "CLIPJECT_START_ELEMENT_SELECTION";
}

/** Sent from content script back to confirm selection mode ended. */
export interface ElementSelectionDoneMessage extends BaseMessage {
  type: "CLIPJECT_ELEMENT_SELECTION_DONE";
}

export type ClipjectMessage =
  | PingMessage
  | PongMessage
  | StartElementSelectionMessage
  | ElementSelectionDoneMessage;
