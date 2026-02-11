# Next.js (App Router)

## 1) Shared Talo client

`src/lib/talo.ts`

```ts
import { TaloClient } from "@talo/pay-sdk";

export const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  // baseUrl: process.env.TALO_BASE_URL, // optional
});
```

## 2) Create payment route

`src/app/api/payments/route.ts`

```ts
import { talo } from "@/lib/talo";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();

  const payment = await talo.payments.create({
    user_id: process.env.TALO_USER_ID!,
    price: { amount: body.amount, currency: "ARS" },
    payment_options: ["transfer"],
    external_id: body.orderId,
    webhook_url: `${process.env.PUBLIC_BASE_URL}/api/talo/webhook`,
    motive: body.motive ?? `Order #${body.orderId}`,
    client_data: body.clientData,
  });

  return Response.json({ payment });
}
```

## 3) Webhook route

`src/app/api/talo/webhook/route.ts`

```ts
import { talo } from "@/lib/talo";

const handler = talo.webhooks.handler({
  // secret: process.env.TALO_WEBHOOK_SECRET,
  onPaymentUpdated: async (event) => {
    console.log("payment.updated", event.paymentId, event.externalId);
  },
  onCustomerPayment: async (event) => {
    console.log("customer.payment", event.customerId, event.transactionId);
  },
});

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}
```
