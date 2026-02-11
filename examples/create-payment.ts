import { TaloClient } from "../src";

const talo = new TaloClient({
  accessToken: process.env.TALO_ACCESS_TOKEN ?? "",
  // baseUrl: "https://api.talo.com.ar", // optional override
});

const payment = await talo.createPayment({
  price: {
    amount: 10000,
    currency: "ARS",
  },
  payment_options: ["transfer"],
  expiration_date: "2026-12-31T23:59:59-03:00",
  callback_url: "https://your-app.com/api/talo/webhook",
  external_id: "order_12345",
  description: "Order #12345",
  customer_data: {
    full_name: "Santiago Perez",
    document_id: "20123456",
    email: "santi@example.com",
    phone: "+541155555555",
  },
  metadata: {
    source: "checkout-web",
  },
});

console.log(payment.id, payment.payment_status, payment.payment_url);
