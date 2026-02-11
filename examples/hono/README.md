# Hono

## `src/index.ts`

```ts
import { Hono } from "hono";
import { TaloClient } from "@talo/pay-sdk";

const app = new Hono();

const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN!,
});

app.post("/payments", async (c) => {
  const body = await c.req.json<{
    amount: number;
    expirationDate: string;
    orderId: string;
  }>();

  const payment = await talo.createPayment({
    price: { amount: body.amount, currency: "ARS" },
    payment_options: ["transfer"],
    expiration_date: body.expirationDate,
    callback_url: `${new URL(c.req.url).origin}/webhooks/talo`,
    external_id: body.orderId,
    description: `Order #${body.orderId}`,
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
