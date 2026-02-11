# NestJS

## 1) `src/talo/talo.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { TaloClient } from "@talo/pay-sdk";

@Injectable()
export class TaloService {
  readonly client = new TaloClient({
    accessToken: process.env.TALO_ACCESS_TOKEN!,
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
      expirationDate: string;
      orderId: string;
      callbackUrl: string;
    },
  ) {
    const payment = await this.taloService.client.createPayment({
      price: { amount: body.amount, currency: "ARS" },
      payment_options: ["transfer"],
      expiration_date: body.expirationDate,
      callback_url: body.callbackUrl,
      external_id: body.orderId,
      description: `Order #${body.orderId}`,
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
    // Rebuild a Web API Request so the SDK webhook handler stays WinterCG-native.
    const webRequest = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: JSON.stringify(req.body ?? {}),
    });

    const response = await this.taloService.client.webhooks.handler({
      onPaymentUpdated: async (event) => {
        console.log("payment.updated", event.paymentId, event.externalId);
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
