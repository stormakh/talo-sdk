import { TaloError } from "./core/errors";
import { paymentUpdatedWebhookEventSchema } from "./schemas";
import type {
  ParsedWebhookPayload,
  PaymentResponse,
  PaymentUpdatedWebhookEvent,
  WebhookHandlerOptions,
} from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

export class TaloWebhooks {
  constructor(
    private readonly getPaymentById: (paymentId: string) => Promise<PaymentResponse>,
  ) {}

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

    const result = paymentUpdatedWebhookEventSchema.safeParse(parsed);
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
   * Build a WinterCG-compatible webhook request handler (Request -> Response).
   *
   * The handler validates payload, fetches the payment by `paymentId`, then runs
   * the optional callback with both webhook event and fresh payment state.
   */
  handler(options: WebhookHandlerOptions = {}): (request: Request) => Promise<Response> {
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
        parsedPayload = this.parseRaw(await request.text());
      } catch (error) {
        if (error instanceof TaloError) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse({ error: "Failed to process webhook payload" }, 400);
      }

      let payment: PaymentResponse;
      try {
        payment = await this.getPaymentById(parsedPayload.event.paymentId);
      } catch (error) {
        if (error instanceof TaloError) {
          return jsonResponse({ error: error.message }, 502);
        }

        return jsonResponse({ error: "Failed to fetch payment" }, 502);
      }

      try {
        await options.onPaymentUpdated?.({
          event: parsedPayload.event,
          payment,
          request,
        });
      } catch {
        return jsonResponse({ error: "Webhook handler execution failed" }, 500);
      }

      return jsonResponse(
        {
          received: true,
          payment_id: payment.id,
          payment_status: payment.payment_status,
        },
        200,
      );
    };
  }

  isPaymentUpdatedEvent(event: unknown): event is PaymentUpdatedWebhookEvent {
    return paymentUpdatedWebhookEventSchema.safeParse(event).success;
  }
}
