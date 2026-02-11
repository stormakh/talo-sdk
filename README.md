# Talo Pay SDK (TypeScript)

Type-safe, WinterCG-compatible SDK for the Talo Transfers API.

## Install

```bash
bun add @talo/pay-sdk
```

## Create a payment

```ts
import { TaloClient } from "@talo/pay-sdk";

const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN!,
});

const payment = await talo.payments.create({
  price: { amount: 10000, currency: "ARS" },
  payment_options: ["transfer"],
  expiration_date: "2026-12-31T23:59:59-03:00",
  callback_url: "https://your-app.com/api/talo/webhook",
  description: "Order #12345",
  external_id: "order_12345",
});

console.log(payment.id, payment.payment_status);
```

## Next.js App Router webhook route

```ts
import { TaloClient } from "@talo/pay-sdk";

const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN!,
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
