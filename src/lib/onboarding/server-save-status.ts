import type { SaveStatus } from "./persistence";

export type ServerSaveSignal = {
  persistence: "durable" | "local" | "unavailable";
  savedDurable: boolean;
  durableAvailable: boolean;
};

/**
 * "Saved" means the browser copy was written and the durable server store
 * accepted it. A failed server write stays "Not saved to server yet".
 * Local-only mode never claims a cloud save.
 */
export function interpretServerSave(result: ServerSaveSignal): SaveStatus {
  if (result.persistence === "durable" && result.savedDurable) return "saved";
  if (result.durableAvailable && !result.savedDurable) return "server-pending";
  return "saved-local";
}
