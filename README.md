# Talo Pay SDK (TypeScript)

Type-safe, WinterCG-compatible SDK for the Talo Transfers API.

## Install

```bash
bun add @talo/pay-sdk
```

## Authentication behavior

The client manages access tokens automatically using your credentials:

- `clientId`
- `clientSecret`
- `userId`

It fetches a token from `POST /users/:user_id/tokens`, caches it in memory, refreshes before expiration, and retries once on `401` with a fresh token.

## Create a payment

```ts
import { TaloClient } from "@talo/pay-sdk";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
});

const payment = await talo.payments.create({
  user_id: process.env.TALO_USER_ID!,
  price: { amount: 10000, currency: "ARS" },
  payment_options: ["transfer"],
  external_id: "order_12345",
  webhook_url: "https://your-app.com/api/talo/webhook",
  motive: "Order #12345",
  client_data: {
    first_name: "Juan",
    last_name: "Perez",
    email: "juan@example.com",
    dni: "12345678",
  },
});

console.log(payment.id, payment.payment_status);
```

## Next.js App Router webhook route

```ts
import { TaloClient } from "@talo/pay-sdk";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
});

const handler = talo.webhooks.handler({
  onPaymentUpdated: async (event) => {
    console.log(event.paymentId, event.externalId);
  },
  onCustomerPayment: async (event) => {
    console.log(event.customerId, event.transactionId);
  },
});

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}
```

## Resources

- `talo.payments.create(...)`
- `talo.payments.get(...)`
- `talo.payments.updateMetadata(...)`
- `talo.customers.create(...)`
- `talo.customers.get(...)`
- `talo.customers.getTransaction(...)`
- `talo.refunds.create(...)`
- `talo.sandbox.simulateCvuTransfer(...)`
- `talo.webhooks.handler(...)`

Top-level aliases are available too (for example, `talo.createPayment(...)`).

## Migration (breaking)

Before:

```ts
new TaloClient({ accessToken: "..." });
```

After:

```ts
new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
});
```
