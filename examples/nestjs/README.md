# NestJS

## Environment setup

Use `environment` for first-class API selection:

- `"production"` -> `https://api.talo.com.ar`
- `"sandbox"` -> `https://sandbox-api.talo.com.ar`

`baseUrl` overrides `environment` if both are provided.

## 1) `src/talo/talo.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { TaloClient } from "talo-pay";

@Injectable()
export class TaloService {
  readonly client = new TaloClient({
    clientId: process.env.TALO_CLIENT_ID!,
    clientSecret: process.env.TALO_CLIENT_SECRET!,
    userId: process.env.TALO_USER_ID!,
    environment: "sandbox",
  });
}
```

## 2) `src/payments/payments.controller.ts`

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { TaloService } from "../talo/talo.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly taloService: TaloService) {}

  @Post()
  async createPayment(
    @Body()
    body: {
      amount: number;
      orderId: string;
      webhookUrl: string;
      motive?: string;
    },
  ) {
    const payment = await this.taloService.client.createPayment({
      user_id: process.env.TALO_USER_ID!,
      price: { amount: body.amount, currency: "ARS" },
      payment_options: ["transfer"],
      external_id: body.orderId,
      webhook_url: body.webhookUrl,
      motive: body.motive ?? `Order #${body.orderId}`,
    });

    return { payment };
  }
}
```

## 3) `src/webhooks/talo-webhooks.controller.ts`

```ts
import { Controller, Post, Req, Res } from "@nestjs/common";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { TaloService } from "../talo/talo.service";

@Controller("webhooks/talo")
export class TaloWebhooksController {
  constructor(private readonly taloService: TaloService) {}

  @Post()
  async handle(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const webRequest = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: JSON.stringify(req.body ?? {}),
    });

    const response = await this.taloService.client.webhooks.handler({
      onPaymentUpdated: async ({ event, payment }) => {
        console.log("payment.updated", event.paymentId, event.externalId, payment.payment_status);
      },
    })(webRequest);

    const responseBody = await response.text();
    res.status(response.status).set(Object.fromEntries(response.headers.entries())).send(responseBody);
  }
}
```

## 4) Register providers/controllers in your module

```ts
import { Module } from "@nestjs/common";
import { TaloService } from "./talo/talo.service";
import { PaymentsController } from "./payments/payments.controller";
import { TaloWebhooksController } from "./webhooks/talo-webhooks.controller";

@Module({
  providers: [TaloService],
  controllers: [PaymentsController, TaloWebhooksController],
})
export class AppModule {}
```
