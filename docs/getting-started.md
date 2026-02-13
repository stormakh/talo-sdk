# Getting Started

## Install

```bash
npm install talo-pay
```

## Create a client

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
const payment = await talo.payments.create({
  user_id: process.env.TALO_USER_ID!,
  price: { amount: 30000, currency: "ARS" },
  payment_options: ["transfer"],
  external_id: "ORDER_123",
  webhook_url: "https://your-app.com/webhooks/talo",
  motive: "Order #123",
  client_data: {
    first_name: "Juan",
    last_name: "Perez",
    email: "juan@example.com",
    dni: "12345678"
  }
});

console.log(payment.id, payment.payment_status, payment.payment_url);
```
