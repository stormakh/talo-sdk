import { describe, expect, test } from "bun:test";
import { TaloClient } from "../src";
import type { FetchLike } from "../src/types";

function createClient(fetchImpl: FetchLike): TaloClient {
  return new TaloClient({
    clientId: "client_123",
    clientSecret: "secret_456",
    userId: "user_789",
    fetch: fetchImpl,
  });
}

describe("TaloWebhooks", () => {
  test("validates event and fetches payment before callback", async () => {
    let authCalls = 0;
    let paymentCalls = 0;
    let callbackStatus = "";

    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        authCalls += 1;
        return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/payments/payment_999")) {
        paymentCalls += 1;
        return new Response(
          JSON.stringify({
            data: {
              id: "payment_999",
              payment_status: "SUCCESS",
              external_id: "order_999",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const handler = talo.webhooks.handler({
      onPaymentUpdated: async ({ event, payment }) => {
        expect(event.paymentId).toBe("payment_999");
        callbackStatus = payment.payment_status;
      },
    });

    const request = new Request("https://example.com/webhooks/talo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Pago Actualizado",
        paymentId: "payment_999",
        externalId: "order_999",
      }),
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(authCalls).toBe(1);
    expect(paymentCalls).toBe(1);
    expect(callbackStatus).toBe("SUCCESS");
  });

  test("returns 400 for invalid payload", async () => {
    const talo = createClient(async () => {
      throw new Error("should not fetch payment");
    });

    const handler = talo.webhooks.handler();

    const request = new Request("https://example.com/webhooks/talo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Pago Actualizado",
        externalId: "order_999",
      }),
    });

    const response = await handler(request);
    expect(response.status).toBe(400);
  });

  test("returns 502 when payment lookup fails", async () => {
    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ message: "Payment not found", code: "not_found" }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const handler = talo.webhooks.handler();

    const request = new Request("https://example.com/webhooks/talo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Pago Actualizado",
        paymentId: "payment_404",
        externalId: "order_404",
      }),
    });

    const response = await handler(request);
    expect(response.status).toBe(502);
  });
});
