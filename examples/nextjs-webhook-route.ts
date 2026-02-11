import { TaloClient } from "../src";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox",
});

const webhookHandler = talo.webhooks.handler({
  onPaymentUpdated: async ({ event, payment }) => {
    console.log("Payment updated", event.paymentId, event.externalId, payment.payment_status);
  },
});

export async function POST(request: Request): Promise<Response> {
  return webhookHandler(request);
}
