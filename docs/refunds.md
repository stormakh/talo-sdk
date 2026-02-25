# Refunds

The SDK follows the Transfers refunds endpoint: `POST /payments/{payment_id}/refunds`.

## Full refund

```ts
await talo.refunds.create("payment_id", {
  refund_type: "FULL",
  blame: {
    team_id: "soporte",
    mail: "soporte@your-app.com",
  },
  user_id: process.env.TALO_USER_ID!,
});
```

## Partial refund

```ts
await talo.refunds.create("payment_id", {
  refund_type: "PARTIAL",
  amount: "500.00",
  currency: "ARS",
  blame: {
    team_id: "soporte",
    mail: "soporte@your-app.com",
  },
  user_id: process.env.TALO_USER_ID!,
});
```

Notes:
- `amount` and `currency` are only valid for `PARTIAL` refunds.
- `blame` must be an object with `team_id` and `mail`.
- `user_id` is always required.
