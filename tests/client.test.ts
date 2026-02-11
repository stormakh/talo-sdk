import { describe, expect, test } from "bun:test";
import { TaloClient } from "../src";
import { ZodError } from "zod";
import type { FetchLike } from "../src/types";

function createClient(fetchImpl: FetchLike): TaloClient {
  return new TaloClient({
    clientId: "client_123",
    clientSecret: "secret_456",
    userId: "user_789",
    fetch: fetchImpl,
  });
}

describe("TaloClient payments", () => {
  test("creates a payment with typed response", async () => {
    const requestedUrls: string[] = [];
    const requestedInits: RequestInit[] = [];

    const talo = createClient(async (input, init) => {
      const url = String(input);
      requestedUrls.push(url);
      requestedInits.push((init ?? {}) as RequestInit);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(
          JSON.stringify({
            data: {
              token: "token_abc",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            id: "payment_123",
            payment_status: "PENDING",
            payment_url: "https://pay.talo.com.ar/p/payment_123",
          },
          code: 200,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const payment = await talo.payments.create({
      user_id: "user_789",
      price: { amount: 10000, currency: "ARS" },
      payment_options: ["transfer"],
      external_id: "order_1",
      webhook_url: "https://example.com/webhooks/talo",
      motive: "Order #1",
    });

    expect(requestedUrls[0]).toBe("https://api.talo.com.ar/users/user_789/tokens");
    expect(requestedUrls[1]).toBe("https://api.talo.com.ar/payments/");
    expect(requestedInits[1]?.method).toBe("POST");
    expect(payment.id).toBe("payment_123");
    expect(payment.payment_status).toBe("PENDING");

    const paymentHeaders = new Headers(requestedInits[1]?.headers);
    expect(paymentHeaders.get("authorization")).toBe("Bearer token_abc");
    expect(paymentHeaders.get("content-type")).toBe("application/json");
  });

  test("throws TaloError with parsed API error payload", async () => {
    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(
          JSON.stringify({ data: { token: "token_abc" } }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          message: "Validation failed",
          code: "validation_error",
          errors: { price: "must be positive" },
        }),
        {
          status: 422,
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_123",
          },
        },
      );
    });

    await expect(
      talo.createPayment({
        user_id: "user_789",
        price: { amount: 10000, currency: "ARS" },
        payment_options: ["transfer"],
        external_id: "order_1",
        webhook_url: "https://example.com/webhooks/talo",
        motive: "Order #1",
      }),
    ).rejects.toMatchObject({
      name: "TaloError",
      message: "Validation failed",
      statusCode: 422,
      errorCode: "validation_error",
      requestId: "req_123",
    });
  });

  test("rejects create payment when price.amount is not a number", async () => {
    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(
          JSON.stringify({ data: { token: "token_abc" } }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ data: { id: "payment_123", payment_status: "PENDING" } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    await expect(
      talo.createPayment({
        user_id: "user_789",
        price: {
          amount: "10000" as unknown as number,
          currency: "ARS",
        },
        payment_options: ["transfer"],
        external_id: "order_1",
        webhook_url: "https://example.com/webhooks/talo",
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
