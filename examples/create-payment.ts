import { TaloClient } from "../src";

const talo = new TaloClient({
  clientId: process.env.TALO_CLIENT_ID!,
  clientSecret: process.env.TALO_CLIENT_SECRET!,
  userId: process.env.TALO_USER_ID!,
  environment: "sandbox", // "production" | "sandbox"
  // baseUrl: "https://sandbox-api.talo.com.ar", // overrides environment when present
});

const payment = await talo.createPayment({
  user_id: process.env.TALO_USER_ID!,
  price: {
    amount: 10000,
    currency: "ARS",
  },
  payment_options: ["transfer"],
  external_id: "order_12345",
  webhook_url: "https://your-app.com/api/talo/webhook",
  motive: "Order #12345",
  client_data: {
    first_name: "Santiago",
    last_name: "Perez",
    email: "santi@example.com",
    phone: "+541155555555",
    dni: "20123456",
  },
});

console.log(payment.id, payment.payment_status, payment.payment_url);
