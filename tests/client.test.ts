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
  test("uses sandbox base URL when environment is sandbox", async () => {
    const requestedUrls: string[] = [];

    const talo = new TaloClient({
      clientId: "client_123",
      clientSecret: "secret_456",
      userId: "user_789",
      environment: "sandbox",
      fetch: async (input) => {
        const url = String(input);
        requestedUrls.push(url);

        if (url.endsWith("/users/user_789/tokens")) {
          return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            data: {
              id: "payment_123",
              payment_status: "PENDING",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    await talo.getPayment("payment_123");

    expect(requestedUrls[0]).toBe("https://sandbox-api.talo.com.ar/users/user_789/tokens");
    expect(requestedUrls[1]).toBe("https://sandbox-api.talo.com.ar/payments/payment_123");
  });

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

  test("parses get payment response when transaction_fields is an object", async () => {
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
          message: "ok",
          error: false,
          code: 200,
          data: {
            id: "VAR-c8953b10-payment",
            payment_status: "SUCCESS",
            external_id: "img_a5c47d84",
            payment_url: "https://talo.com.ar/payments/VAR-c8953b10-payment",
            creation_timestamp: "2026-02-13T14:47:31.212Z",
            expiration_timestamp: "2026-02-14T13:47:31.212Z",
            last_modified_timestamp: "2026-02-13T14:48:07.761Z",
            price: { amount: 100, currency: "ARS" },
            payment_options: ["transfer"],
            quotes: [
              {
                alias: "kamrot.8881.talo",
                amount: "100",
                address: "0000335100000000004774",
                network: "CRESIUM",
              },
            ],
            transaction_fields: {
              amount: "100",
              commission_amount: "0",
              currency: "ARS",
            },
            transactions: [
              {
                transaction_id: "CRS-198-304855",
                amount: "100",
                transaction_status: "PROCESSED",
                network: "CRESIUM",
              },
            ],
            user_id: "c8953b10-a179-438d-8a1a-2d59f850db3d",
            webhook_url: "https://image-generation-demo.vercel.app/api/webhooks/talo",
            status: "SUCCESS",
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const payment = await talo.getPayment("VAR-c8953b10-payment");

    expect(payment.id).toBe("VAR-c8953b10-payment");
    expect(payment.payment_status).toBe("SUCCESS");
    expect(payment.transaction_fields).toMatchObject({
      amount: "100",
      commission_amount: "0",
      currency: "ARS",
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
