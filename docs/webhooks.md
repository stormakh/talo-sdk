# Webhooks

The webhook flow is:

1. Receive webhook event from Talo.
2. Validate payload shape.
3. Fetch payment from Talo using `paymentId`.
4. Use fetched payment status as source of truth.

## Next.js App Router example

```ts
import { TaloClient } from "talo-pay";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox"
});

const handler = talo.webhooks.handler({
  onPaymentUpdated: async ({ event, payment }) => {
    console.log("Webhook event", event.paymentId, event.externalId);
    console.log("Current status", payment.payment_status);

    // Persist the payment status in your database.
  }
});

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}
```

The SDK handles access-token retrieval automatically while fetching the payment.
