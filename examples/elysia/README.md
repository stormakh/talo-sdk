# Elysia

## Environment setup

Use `environment` for first-class API selection:

- `"production"` -> `https://api.talo.com.ar`
- `"sandbox"` -> `https://sandbox-api.talo.com.ar`

`baseUrl` overrides `environment` if both are provided.

## `src/server.ts`

```ts
import { Elysia } from "elysia";
import { TaloClient } from "@talo/pay-sdk";

const app = new Elysia();

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox",
});

app.post("/payments", async ({ body, request }) => {
  const input = body as {
    amount: number;
    orderId: string;
    motive?: string;
  };

  const payment = await talo.payments.create({
    user_id: process.env.TALO_USER_ID!,
    price: { amount: input.amount, currency: "ARS" },
    payment_options: ["transfer"],
    external_id: input.orderId,
    webhook_url: `${new URL(request.url).origin}/webhooks/talo`,
    motive: input.motive ?? `Order #${input.orderId}`,
  });

  return { payment };
});

const webhookHandler = talo.webhooks.handler({
  onPaymentUpdated: async ({ event, payment }) => {
    console.log("payment.updated", event.paymentId, event.externalId, payment.payment_status);
  },
});

app.post("/webhooks/talo", async ({ request }) => {
  return webhookHandler(request);
});

app.listen(3000);
```
