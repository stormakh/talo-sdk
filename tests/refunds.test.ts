import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";
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

describe("TaloClient refunds", () => {
  test("creates FULL refund with docs-aligned payload", async () => {
    const requestedUrls: string[] = [];
    const requestedBodies: unknown[] = [];

    const talo = createClient(async (input, init) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/payments/payment_1/refunds")) {
        requestedBodies.push(JSON.parse(String(init?.body ?? "{}")));

        return new Response(
          JSON.stringify({
            data: {
              refund_id: "refund_1",
              payment_id: "payment_1",
              status: "CREATED",
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

    const refund = await talo.createRefund("payment_1", {
      refund_type: "FULL",
      blame: {
        team_id: "soporte",
        mail: "soporte@talo.com.ar",
      },
      user_id: "user_789",
    });

    expect(requestedUrls).toEqual([
      "https://api.talo.com.ar/users/user_789/tokens",
      "https://api.talo.com.ar/payments/payment_1/refunds",
    ]);
    expect(requestedBodies[0]).toEqual({
      refund_type: "FULL",
      blame: {
        team_id: "soporte",
        mail: "soporte@talo.com.ar",
      },
      user_id: "user_789",
    });
    expect(refund.refund_id).toBe("refund_1");
    expect(refund.status).toBe("CREATED");
  });

  test("creates PARTIAL refund with amount and currency", async () => {
    let capturedBody: unknown;

    const talo = createClient(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/payments/payment_2/refunds")) {
        capturedBody = JSON.parse(String(init?.body ?? "{}"));
        return new Response(
          JSON.stringify({
            data: {
              refund_id: "refund_2",
              payment_id: "payment_2",
              amount: "500.00",
              currency: "ARS",
              status: "CREATED",
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

    const refund = await talo.refunds.create("payment_2", {
      refund_type: "PARTIAL",
      amount: "500.00",
      currency: "ARS",
      blame: {
        team_id: "soporte",
        mail: "soporte@talo.com.ar",
      },
      user_id: "user_789",
    });

    expect(capturedBody).toEqual({
      refund_type: "PARTIAL",
      amount: "500.00",
      currency: "ARS",
      blame: {
        team_id: "soporte",
        mail: "soporte@talo.com.ar",
      },
      user_id: "user_789",
    });
    expect(refund.amount).toBe("500.00");
    expect(refund.currency).toBe("ARS");
  });

  test("rejects invalid refund payloads", async () => {
    const talo = createClient(async () => new Response("", { status: 500 }));

    await expect(
      talo.createRefund("payment_3", {
        refund_type: "PARTIAL",
        currency: "ARS",
        blame: {
          team_id: "soporte",
          mail: "soporte@talo.com.ar",
        },
        user_id: "user_789",
      } as unknown as never),
    ).rejects.toBeInstanceOf(ZodError);

    await expect(
      talo.createRefund("payment_3", {
        refund_type: "FULL",
        blame: {
          team_id: "soporte",
          mail: "soporte@talo.com.ar",
        },
        user_id: "user_789",
        amount: "500.00",
      } as unknown as never),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
