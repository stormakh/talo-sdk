import {
  customerPaymentWebhookEventSchema,
  paymentUpdatedWebhookEventSchema,
  webhookEventSchema,
} from "./schemas";
import { TaloError } from "./core/errors";
import type {
  CustomerPaymentWebhookEvent,
  ParsedWebhookPayload,
  PaymentUpdatedWebhookEvent,
  TaloWebhookEvent,
  WebhookHandlerOptions,
  WebhookVerificationOptions,
} from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function normalizeSignature(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("sha256=")) {
    return trimmed.slice("sha256=".length);
  }
  return trimmed;
}

function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(data: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < data.length; index += 3) {
    const a = data[index] ?? 0;
    const b = data[index + 1] ?? 0;
    const c = data[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;

    output += alphabet[(triple >> 18) & 63];
    output += alphabet[(triple >> 12) & 63];
    output += index + 1 < data.length ? alphabet[(triple >> 6) & 63] : "=";
    output += index + 2 < data.length ? alphabet[triple & 63] : "=";
  }

  return output;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

export class TaloWebhooks {
  /**
   * Parse and validate a webhook request payload.
   */
  async parse(request: Request): Promise<ParsedWebhookPayload> {
    const rawBody = await request.text();
    return this.parseRaw(rawBody);
  }

  /**
   * Parse and validate a raw webhook payload body.
   */
  parseRaw(rawBody: string): ParsedWebhookPayload {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawBody);
    } catch (error) {
      throw new TaloError("Invalid webhook JSON payload", {
        cause: error,
        rawBody,
      });
    }

    const result = webhookEventSchema.safeParse(parsed);
    if (!result.success) {
      throw new TaloError("Webhook payload failed validation", {
        details: result.error.flatten(),
        rawBody,
      });
    }

    return {
      rawBody,
      event: result.data,
    };
  }

  /**
   * Verify an HMAC SHA-256 signature for a webhook payload.
   */
  async verifySignature(options: WebhookVerificationOptions & { payload: string }): Promise<boolean> {
    const algorithm = options.algorithm ?? "SHA-256";
    const normalizedSignature = normalizeSignature(options.signature);

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(options.secret),
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"],
    );

    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(options.payload),
    );

    const bytes = new Uint8Array(signed);
    const expectedHex = toHex(bytes);
    const expectedBase64 = toBase64(bytes);

    return (
      timingSafeEqual(expectedHex, normalizedSignature) ||
      timingSafeEqual(expectedBase64, normalizedSignature)
    );
  }

  /**
   * Build a WinterCG-compatible webhook request handler (Request -> Response).
   */
  handler(options: WebhookHandlerOptions = {}): (request: Request) => Promise<Response> {
    const signatureHeader = options.signatureHeader ?? "x-talo-signature";

    return async (request: Request): Promise<Response> => {
      if (request.method !== "POST") {
        return new Response(null, {
          status: 405,
          headers: {
            allow: "POST",
          },
        });
      }

      let parsedPayload: ParsedWebhookPayload;

      try {
        const rawBody = await request.text();
        const signature = request.headers.get(signatureHeader);

        if (options.verifySignature !== undefined) {
          const verified = await options.verifySignature({
            request,
            rawBody,
            signature,
          });

          if (!verified) {
            return jsonResponse({ error: "Invalid webhook signature" }, 401);
          }
        } else if (options.secret !== undefined) {
          if (signature === null) {
            return jsonResponse({ error: "Missing webhook signature" }, 401);
          }

          const verified = await this.verifySignature({
            payload: rawBody,
            secret: options.secret,
            signature,
          });

          if (!verified) {
            return jsonResponse({ error: "Invalid webhook signature" }, 401);
          }
        }

        parsedPayload = this.parseRaw(rawBody);
      } catch (error) {
        if (error instanceof TaloError) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse({ error: "Failed to process webhook payload" }, 400);
      }

      try {
        await options.onEvent?.(parsedPayload.event, request);

        if (this.isPaymentUpdatedEvent(parsedPayload.event)) {
          await options.onPaymentUpdated?.(parsedPayload.event, request);
        }

        if (this.isCustomerPaymentEvent(parsedPayload.event)) {
          await options.onCustomerPayment?.(parsedPayload.event, request);
        }
      } catch {
        return jsonResponse({ error: "Webhook handler execution failed" }, 500);
      }

      return jsonResponse({ received: true }, 200);
    };
  }

  isPaymentUpdatedEvent(event: TaloWebhookEvent): event is PaymentUpdatedWebhookEvent {
    return paymentUpdatedWebhookEventSchema.safeParse(event).success;
  }

  isCustomerPaymentEvent(event: TaloWebhookEvent): event is CustomerPaymentWebhookEvent {
    return customerPaymentWebhookEventSchema.safeParse(event).success;
  }
}
