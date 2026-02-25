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

describe("TaloClient partners", () => {
  test("builds partner authorization URLs", () => {
    const talo = createClient(async () => new Response("", { status: 500 }));

    expect(talo.getPartnerAuthorizationUrl("partner_abc")).toBe(
      "https://app.talo.com.ar/authorize/partner_abc",
    );

    expect(
      talo.getPartnerAuthorizationUrl("partner_abc", {
        referredUserId: "external_123",
      }),
    ).toBe(
      "https://app.talo.com.ar/authorize/partner_abc?referred_user_id=external_123",
    );
  });

  test("exchanges partner code without managed bearer auth", async () => {
    let managedTokenCalls = 0;
    let exchangeCalls = 0;
    let exchangeAuthorization: string | null = null;
    let exchangeBody = "";

    const talo = createClient(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/users/user_789/tokens")) {
        managedTokenCalls += 1;
        return new Response(JSON.stringify({ data: { token: "token_should_not_be_used" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/auth/tokens")) {
        exchangeCalls += 1;
        const headers = new Headers(init?.headers);
        exchangeAuthorization = headers.get("authorization");
        exchangeBody = String(init?.body ?? "");

        return new Response(
          JSON.stringify({
            data: {
              token: "PAR-token",
              user_id: "user_partner_1",
              referred_user_id: "external_123",
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

    const exchange = await talo.exchangePartnerToken({
      code: "code_123",
      client_id: "partner_abc",
      client_secret: "partner_secret",
    });

    expect(exchangeCalls).toBe(1);
    expect(managedTokenCalls).toBe(0);
    expect(exchangeAuthorization).toBeNull();
    expect(JSON.parse(exchangeBody)).toEqual({
      code: "code_123",
      client_id: "partner_abc",
      client_secret: "partner_secret",
    });
    expect(exchange.token).toBe("PAR-token");
    expect(exchange.user_id).toBe("user_partner_1");
    expect(exchange.referred_user_id).toBe("external_123");
  });

  test("gets and updates partner account configuration", async () => {
    const requestedMethods: string[] = [];
    const requestedUrls: string[] = [];
    const requestBodies: unknown[] = [];

    const talo = createClient(async (input, init) => {
      const url = String(input);
      requestedUrls.push(url);
      requestedMethods.push(init?.method ?? "GET");

      if (url.endsWith("/users/user_789/tokens")) {
        return new Response(JSON.stringify({ data: { token: "token_abc" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/users/account_user/account")) {
        return new Response(
          JSON.stringify({
            data: {
              user_id: "account_user",
              account_status: "ACTIVE",
              alias_prefix: "myapp",
              transfer_tolerance: 10,
              payout_schedule: {
                address: "my.withdraw.alias",
                frequency: "daily",
              },
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url.endsWith("/users/account_user")) {
        requestBodies.push(JSON.parse(String(init?.body ?? "{}")));

        return new Response(
          JSON.stringify({
            data: {
              user_id: "account_user",
              account_status: "ACTIVE",
              alias_prefix: "myapp",
              transfer_tolerance: 15,
              payout_schedule: {
                address: "new.withdraw.alias",
                frequency: "weekly",
              },
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

    const account = await talo.getPartnerAccount("account_user");
    const updated = await talo.updatePartnerAccount("account_user", {
      transfer_tolerance: 15,
      payout_schedule: {
        address: "new.withdraw.alias",
        frequency: "weekly",
      },
    });

    expect(account.account_status).toBe("ACTIVE");
    expect(account.payout_schedule?.address).toBe("my.withdraw.alias");
    expect(updated.transfer_tolerance).toBe(15);
    expect(updated.payout_schedule?.frequency).toBe("weekly");

    expect(requestedUrls).toEqual([
      "https://api.talo.com.ar/users/user_789/tokens",
      "https://api.talo.com.ar/users/account_user/account",
      "https://api.talo.com.ar/users/account_user",
    ]);
    expect(requestedMethods).toEqual(["POST", "GET", "PATCH"]);
    expect(requestBodies[0]).toEqual({
      transfer_tolerance: 15,
      payout_schedule: {
        address: "new.withdraw.alias",
        frequency: "weekly",
      },
    });
  });

  test("validates partner account update payload", async () => {
    const talo = createClient(async () => new Response("", { status: 500 }));

    await expect(
      talo.updatePartnerAccount("account_user", {
        alias_prefix: "INVALID",
      }),
    ).rejects.toBeInstanceOf(ZodError);

    await expect(
      talo.updatePartnerAccount("account_user", {} as unknown as never),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
