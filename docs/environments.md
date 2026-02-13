# Environments

`TaloClient` supports first-class environment selection:

- `environment: "production"` -> `https://api.talo.com.ar`
- `environment: "sandbox"` -> `https://sandbox-api.talo.com.ar`

If `baseUrl` is provided, it overrides `environment`.

## Production

```ts
import { TaloClient } from "talo-pay";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "production"
});
```

## Sandbox

```ts
import { TaloClient } from "talo-pay";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox"
});
```

## Custom base URL override

```ts
import { TaloClient } from "talo-pay";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "production",
  baseUrl: "https://custom-proxy.example.com"
});
```
