import { EventEmitter } from "events";

// Global event bus for pet-related realtime notifications
export const petEvents = new EventEmitter();

// Increase listener limit to avoid warnings when many clients connect
petEvents.setMaxListeners(50);
