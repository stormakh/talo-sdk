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

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createJwtWithExp(expSeconds: number): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ exp: expSeconds }));
  return `${header}.${payload}.signature`;
}

describe("Talo token lifecycle", () => {
  test("fetches token on first API call", async () => {
    let authCalls = 0;
    let paymentCalls = 0;

    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        authCalls += 1;
        return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      paymentCalls += 1;
      return new Response(
        JSON.stringify({ data: { id: "payment_1", payment_status: "PENDING" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    await talo.getPayment("payment_1");

    expect(authCalls).toBe(1);
    expect(paymentCalls).toBe(1);
  });

  test("reuses cached token before refresh window", async () => {
    let authCalls = 0;
    const paymentAuthorizations: string[] = [];
    const token = createJwtWithExp(Math.floor(Date.now() / 1000) + 3600);

    const talo = createClient(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        authCalls += 1;
        return new Response(JSON.stringify({ data: { token } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const headers = new Headers(init?.headers);
      paymentAuthorizations.push(headers.get("authorization") ?? "");

      return new Response(
        JSON.stringify({ data: { id: "payment_reused", payment_status: "PENDING" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    await talo.getPayment("payment_a");
    await talo.getPayment("payment_b");

    expect(authCalls).toBe(1);
    expect(paymentAuthorizations).toEqual([`Bearer ${token}`, `Bearer ${token}`]);
  });

  test("refreshes token when inside preemptive window", async () => {
    let authCalls = 0;
    const paymentAuthorizations: string[] = [];

    const tokenNearExpiry = createJwtWithExp(Math.floor(Date.now() / 1000) + 120);
    const refreshedToken = createJwtWithExp(Math.floor(Date.now() / 1000) + 3600);

    const talo = createClient(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        authCalls += 1;
        const token = authCalls === 1 ? tokenNearExpiry : refreshedToken;

        return new Response(JSON.stringify({ data: { token } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const headers = new Headers(init?.headers);
      paymentAuthorizations.push(headers.get("authorization") ?? "");

      return new Response(
        JSON.stringify({ data: { id: "payment_refresh", payment_status: "PENDING" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    await talo.getPayment("payment_a");
    await talo.getPayment("payment_b");

    expect(authCalls).toBe(2);
    expect(paymentAuthorizations[0]).toBe(`Bearer ${tokenNearExpiry}`);
    expect(paymentAuthorizations[1]).toBe(`Bearer ${refreshedToken}`);
  });

  test("deduplicates concurrent refresh calls", async () => {
    let authCalls = 0;
    let paymentCalls = 0;

    const tokenNearExpiry = createJwtWithExp(Math.floor(Date.now() / 1000) + 120);
    const refreshedToken = createJwtWithExp(Math.floor(Date.now() / 1000) + 3600);

    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        authCalls += 1;
        if (authCalls === 2) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        return new Response(
          JSON.stringify({
            data: {
              token: authCalls === 1 ? tokenNearExpiry : refreshedToken,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      paymentCalls += 1;
      return new Response(
        JSON.stringify({ data: { id: "payment_shared", payment_status: "PENDING" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    await talo.getPayment("seed");

    await Promise.all([
      talo.getPayment("payment_a"),
      talo.getPayment("payment_b"),
    ]);

    expect(authCalls).toBe(2);
    expect(paymentCalls).toBe(3);
  });

  test("retries once on 401 with refreshed token", async () => {
    let authCalls = 0;
    let paymentCalls = 0;
    const usedTokens: string[] = [];

    const tokenOne = createJwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    const tokenTwo = createJwtWithExp(Math.floor(Date.now() / 1000) + 3600);

    const talo = createClient(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        authCalls += 1;
        return new Response(
          JSON.stringify({
            data: {
              token: authCalls === 1 ? tokenOne : tokenTwo,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      paymentCalls += 1;
      const authorization = new Headers(init?.headers).get("authorization") ?? "";
      usedTokens.push(authorization);

      if (paymentCalls === 1) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ data: { id: "payment_retry", payment_status: "SUCCESS" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const payment = await talo.getPayment("payment_retry");

    expect(payment.payment_status).toBe("SUCCESS");
    expect(authCalls).toBe(2);
    expect(paymentCalls).toBe(2);
    expect(usedTokens).toEqual([`Bearer ${tokenOne}`, `Bearer ${tokenTwo}`]);
  });

  test("surfaces auth endpoint failures as TaloError", async () => {
    const talo = createClient(async (input) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(
          JSON.stringify({
            message: "Invalid client credentials",
            code: "auth_error",
          }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response("", { status: 500 });
    });

    await expect(talo.getPayment("payment_x")).rejects.toMatchObject({
      name: "TaloError",
      statusCode: 401,
      message: "Invalid client credentials",
      errorCode: "auth_error",
    });
  });
});
