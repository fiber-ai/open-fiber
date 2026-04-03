import { createClient } from "@fiberai/sdk";

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getFiberClient() {
  if (!clientInstance) {
    clientInstance = createClient({
      baseUrl: "https://api.fiber.ai",
    });
  }
  return clientInstance;
}
