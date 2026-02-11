import { describe, expect, test } from "bun:test";
import { TaloClient } from "../src";

function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return toHex(new Uint8Array(signature));
}

describe("TaloWebhooks", () => {
  test("routes payment update events", async () => {
    const talo = new TaloClient({ accessToken: "token" });
    let receivedPaymentId = "";

    const handler = talo.webhooks.handler({
      onPaymentUpdated: async (event) => {
        receivedPaymentId = event.paymentId;
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
    expect(receivedPaymentId).toBe("payment_999");
  });

  test("rejects when signature verification fails", async () => {
    const talo = new TaloClient({ accessToken: "token" });

    const handler = talo.webhooks.handler({
      secret: "super-secret",
    });

    const request = new Request("https://example.com/webhooks/talo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-talo-signature": "invalid-signature",
      },
      body: JSON.stringify({
        message: "Pago Actualizado",
        paymentId: "payment_999",
        externalId: "order_999",
      }),
    });

    const response = await handler(request);
    expect(response.status).toBe(401);
  });

  test("accepts valid signature", async () => {
    const talo = new TaloClient({ accessToken: "token" });
    const payload = JSON.stringify({
      message: "Pago recibido",
      transactionId: "tx_123",
      customerId: "customer_123",
    });
    const signature = await hmacSha256Hex(payload, "super-secret");

    const handler = talo.webhooks.handler({
      secret: "super-secret",
      onCustomerPayment: async () => {
        return;
      },
    });

    const request = new Request("https://example.com/webhooks/talo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-talo-signature": signature,
      },
      body: payload,
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
  });
});
