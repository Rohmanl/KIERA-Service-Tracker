/// <reference types="vite/client" />

declare var pendo: {
  track(eventName: string, metadata?: Record<string, unknown>): void;
} | undefined;
