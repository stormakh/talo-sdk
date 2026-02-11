# Elysia

## `src/server.ts`

```ts
import { Elysia } from "elysia";
import { TaloClient } from "@talo/pay-sdk";

const app = new Elysia();

const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN!,
});

app.post("/payments", async ({ body, request }) => {
  const input = body as {
    amount: number;
    expirationDate: string;
    orderId: string;
  };

  const payment = await talo.payments.create({
    price: { amount: input.amount, currency: "ARS" },
    payment_options: ["transfer"],
    expiration_date: input.expirationDate,
    callback_url: `${new URL(request.url).origin}/webhooks/talo`,
    external_id: input.orderId,
    description: `Order #${input.orderId}`,
  });

  return { payment };
});

const webhookHandler = talo.webhooks.handler({
  onPaymentUpdated: async (event) => {
    console.log("payment.updated", event.paymentId, event.externalId);
  },
  onCustomerPayment: async (event) => {
    console.log("customer.payment", event.customerId, event.transactionId);
  },
});

app.post("/webhooks/talo", async ({ request }) => {
  return webhookHandler(request);
});

app.listen(3000);
```
