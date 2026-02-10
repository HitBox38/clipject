/**
 * Message types exchanged between extension contexts.
 * Currently unused — reserved for future background ↔ content messaging.
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

export type ClipjectMessage = PingMessage | PongMessage;
