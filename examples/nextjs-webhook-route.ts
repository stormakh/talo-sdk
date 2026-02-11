import { TaloClient } from "../src";

const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN ?? "",
});

const webhookHandler = talo.webhooks.handler({
  // Talo webhooks are currently unauthenticated; include secret once signature support is enabled.
  // secret: process.env.TALO_WEBHOOK_SECRET,
  onPaymentUpdated: async (event) => {
    console.log("Payment updated", event.paymentId, event.externalId);
    // Update your order status by paymentId/externalId.
  },
  onCustomerPayment: async (event) => {
    console.log("Customer transfer received", event.customerId, event.transactionId);
    // Reconcile incoming transfer.
  },
});

export async function POST(request: Request): Promise<Response> {
  return webhookHandler(request);
}
