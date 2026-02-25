# Talo Pay SDK (TypeScript)

Type-safe, WinterCG-compatible SDK for the Talo Transfers API.

## Install

```bash
npm install talo-pay
# or
bun add talo-pay
```

## Authentication behavior

The client manages access tokens automatically using your credentials:

- `clientId`
- `clientSecret`
- `userId`

It fetches a token from `POST /users/:user_id/tokens`, caches it in memory, refreshes before expiration, and retries once on `401` with a fresh token.

## Environment selection

The SDK supports first-class environments:

- `environment: "production"` -> `https://api.talo.com.ar`
- `environment: "sandbox"` -> `https://sandbox-api.talo.com.ar`

If `baseUrl` is provided, it overrides `environment`.

```ts
import { TaloClient } from "talo-pay";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox", // "production" | "sandbox"
});
```

## Create a payment

```ts
import { TaloClient } from "talo-pay";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "production",
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

## Create a refund

```ts
const refund = await talo.refunds.create("VAR-123", {
  refund_type: "PARTIAL", // or "FULL"
  amount: "500.00", // required only for PARTIAL
  currency: "ARS", // required only for PARTIAL
  blame: {
    team_id: "soporte",
    mail: "soporte@your-app.com",
  },
  user_id: process.env.TALO_USER_ID!,
});

console.log(refund.refund_id, refund.status);
```

## Partner flows

```ts
// 1) Redirect URL to onboard a user
const authorizationUrl = talo.partners.getAuthorizationUrl("partner_id", {
  referredUserId: "external_user_123",
});

// 2) Exchange callback code for partner token + user mapping
const exchange = await talo.partners.exchangeToken({
  code: "code_from_redirect",
  client_id: process.env.TALO_PARTNER_ID!,
  client_secret: process.env.TALO_PARTNER_SECRET!,
});

// 3) Query/update account config
const account = await talo.partners.getAccount(exchange.user_id);
await talo.partners.updateAccount(exchange.user_id, {
  transfer_tolerance: 15,
});
```

## Next.js App Router webhook route

```ts
import { createWebhookHandler } from "talo-pay";

const handler = createWebhookHandler({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox",
}, {
  onPaymentUpdated: async ({ event, payment }) => {
    console.log(event.paymentId, event.externalId, payment.payment_status);
  },
});

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}
```

## Documentation

- Getting started: `docs/getting-started.md`
- Environments: `docs/environments.md`
- Partners: `docs/partners.md`
- Refunds: `docs/refunds.md`
- Webhooks: `docs/webhooks.md`

## Resources

- `talo.payments.create(...)`
- `talo.payments.get(...)`
- `talo.payments.updateMetadata(...)`
- `talo.customers.create(...)`
- `talo.customers.get(...)`
- `talo.customers.getTransaction(...)`
- `talo.partners.getAuthorizationUrl(...)`
- `talo.partners.exchangeToken(...)`
- `talo.partners.getAccount(...)`
- `talo.partners.updateAccount(...)`
- `talo.refunds.create(...)`
- `talo.sandbox.simulateCvuTransfer(...)`
- `talo.webhooks.handler(...)`
- `createWebhookHandler(...)`

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
  environment: "production",
});
```
