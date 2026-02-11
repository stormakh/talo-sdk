# Next.js (App Router)

## 1) Shared Talo client

`src/lib/talo.ts`

```ts
import { TaloClient } from "@talo/pay-sdk";

export const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN!,
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
    price: { amount: body.amount, currency: "ARS" },
    payment_options: ["transfer"],
    expiration_date: body.expirationDate,
    callback_url: `${process.env.PUBLIC_BASE_URL}/api/talo/webhook`,
    external_id: body.orderId,
    description: `Order #${body.orderId}`,
    customer_data: body.customer,
    metadata: { source: "nextjs-checkout" },
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
    // e.g. update order status by event.externalId
    console.log("payment.updated", event.paymentId, event.externalId);
  },
  onCustomerPayment: async (event) => {
    // e.g. reconcile wallet transfer
    console.log("customer.payment", event.customerId, event.transactionId);
  },
});

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}
```
