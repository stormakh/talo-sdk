# Hono

## `src/index.ts`

```ts
import { Hono } from "hono";
import { TaloClient } from "@talo/pay-sdk";

const app = new Hono();

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
});

app.post("/payments", async (c) => {
  const body = await c.req.json<{
    amount: number;
    orderId: string;
    motive?: string;
  }>();

  const payment = await talo.createPayment({
    user_id: process.env.TALO_USER_ID!,
    price: { amount: body.amount, currency: "ARS" },
    payment_options: ["transfer"],
    external_id: body.orderId,
    webhook_url: `${new URL(c.req.url).origin}/webhooks/talo`,
    motive: body.motive ?? `Order #${body.orderId}`,
  });

  return c.json({ payment });
});

const webhookHandler = talo.webhooks.handler({
  onPaymentUpdated: async (event) => {
    console.log("payment.updated", event.paymentId, event.externalId);
  },
});

app.post("/webhooks/talo", async (c) => {
  const response = await webhookHandler(c.req.raw);
  return response;
});

export default app;
```
