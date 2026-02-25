# Partners

The SDK exposes partner onboarding and account configuration endpoints.

## Build authorization URL

```ts
const url = talo.partners.getAuthorizationUrl("partner_id", {
  referredUserId: "external_user_123",
});

// https://app.talo.com.ar/authorize/{partner_id}?referred_user_id={external_user_id}
```

## Exchange callback code

```ts
const exchange = await talo.partners.exchangeToken({
  code: "code_from_redirect",
  client_id: process.env.TALO_PARTNER_ID!,
  client_secret: process.env.TALO_PARTNER_SECRET!,
});

console.log(exchange.token, exchange.user_id, exchange.referred_user_id);
```

## Get account status

```ts
const account = await talo.partners.getAccount(exchange.user_id);
console.log(account.account_status);
```

`account_status` values documented by Talo are:
- `ACTIVE`
- `PENDING`
- `REJECTED`
- `SUSPENDED`

## Update account configuration

```ts
await talo.partners.updateAccount(exchange.user_id, {
  alias_prefix: "myapp",
  cancellation_period: 30,
  transfer_tolerance: 10,
  payout_schedule: {
    address: "my.withdraw.alias",
    frequency: "daily", // bi_daily | daily | weekly | monthly
  },
});
```
