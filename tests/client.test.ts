import { describe, expect, test } from "bun:test";
import { TaloClient } from "../src";

describe("TaloClient payments", () => {
  test("creates a payment with typed response", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;

    const talo = new TaloClient({
      accessToken: "test_token",
      fetch: async (input, init) => {
        requestedUrl = String(input);
        requestedInit = init;

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
      },
    });

    const payment = await talo.payments.create({
      price: { amount: 10000, currency: "ARS" },
      payment_options: ["transfer"],
      expiration_date: "2026-12-31T23:59:59-03:00",
      callback_url: "https://example.com/webhooks/talo",
      description: "Order #1",
    });

    expect(requestedUrl).toBe("https://api.talo.com.ar/payments/");
    expect(requestedInit?.method).toBe("POST");
    expect(payment.id).toBe("payment_123");
    expect(payment.payment_status).toBe("PENDING");

    const headers = new Headers(requestedInit?.headers);
    expect(headers.get("authorization")).toBe("Bearer test_token");
    expect(headers.get("content-type")).toBe("application/json");
  });

  test("throws TaloError with parsed API error payload", async () => {
    const talo = new TaloClient({
      accessToken: "test_token",
      fetch: async () =>
        new Response(
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
        ),
    });

    await expect(
      talo.createPayment({
        price: { amount: 10000, currency: "ARS" },
        payment_options: ["transfer"],
        expiration_date: "2026-12-31T23:59:59-03:00",
        callback_url: "https://example.com/webhooks/talo",
        description: "Order #1",
      }),
    ).rejects.toMatchObject({
      name: "TaloError",
      message: "Validation failed",
      statusCode: 422,
      errorCode: "validation_error",
      requestId: "req_123",
    });
  });
});
