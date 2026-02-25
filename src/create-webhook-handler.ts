import { TaloClient } from "./client";
import type { TaloClientConfig, WebhookHandlerOptions } from "./types";

/**
 * Build a WinterCG-compatible webhook request handler without manually
 * instantiating a TaloClient in user land.
 */
export function createWebhookHandler(
  config: TaloClientConfig,
  options: WebhookHandlerOptions = {},
): (request: Request) => Promise<Response> {
  return new TaloClient(config).webhooks.handler(options);
}
