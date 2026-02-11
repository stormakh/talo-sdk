import { TaloClient } from "../src";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
});

const webhookHandler = talo.webhooks.handler({
  // secret: process.env.TALO_WEBHOOK_SECRET,
  onPaymentUpdated: async (event) => {
    console.log("Payment updated", event.paymentId, event.externalId);
  },
  onCustomerPayment: async (event) => {
    console.log("Customer transfer received", event.customerId, event.transactionId);
  },
});

export async function POST(request: Request): Promise<Response> {
  return webhookHandler(request);
}
