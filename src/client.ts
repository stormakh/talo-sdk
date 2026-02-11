import { z } from "zod";
import { TaloTokenManager } from "./core/auth";
import { TaloHttpClient } from "./core/http";
import { CustomersResource } from "./resources/customers";
import { PaymentsResource } from "./resources/payments";
import { RefundsResource } from "./resources/refunds";
import { SandboxResource } from "./resources/sandbox";
import { TaloWebhooks } from "./webhooks";
import type {
  CreateCustomerRequest,
  CreatePaymentRequest,
  CreateRefundRequest,
  CustomerResponse,
  CustomerTransactionResponse,
  PaymentResponse,
  RefundResponse,
  SimulateFaucetRequest,
  SimulateFaucetResponse,
  TaloClientConfig,
  UpdatePaymentMetadataRequest,
  FetchLike,
} from "./types";

const clientConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  userId: z.string().min(1),
  baseUrl: z.string().url().optional(),
  headers: z.custom<HeadersInit>().optional(),
  fetch: z.custom<FetchLike>().optional(),
});

/**
 * Talo API client for Payments, Customers, Refunds and Webhooks.
 *
 * Access tokens are automatically fetched and refreshed from
 * POST /users/:user_id/tokens using client credentials.
 */
export class TaloClient {
  readonly payments: PaymentsResource;
  readonly customers: CustomersResource;
  readonly refunds: RefundsResource;
  readonly sandbox: SandboxResource;
  readonly webhooks: TaloWebhooks;

  constructor(config: TaloClientConfig) {
    const parsedConfig = clientConfigSchema.parse(config);

    const baseUrl = parsedConfig.baseUrl ?? "https://api.talo.com.ar";

    const tokenManager = new TaloTokenManager({
      baseUrl,
      clientId: parsedConfig.clientId,
      clientSecret: parsedConfig.clientSecret,
      userId: parsedConfig.userId,
      headers: parsedConfig.headers,
      fetch: parsedConfig.fetch,
    });

    const httpClient = new TaloHttpClient({
      baseUrl,
      tokenProvider: tokenManager,
      headers: parsedConfig.headers,
      fetch: parsedConfig.fetch,
    });

    this.payments = new PaymentsResource(httpClient);
    this.customers = new CustomersResource(httpClient);
    this.refunds = new RefundsResource(httpClient);
    this.sandbox = new SandboxResource(httpClient);
    this.webhooks = new TaloWebhooks();
  }

  /**
   * Alias for payments.create().
   */
  createPayment(input: CreatePaymentRequest): Promise<PaymentResponse> {
    return this.payments.create(input);
  }

  /**
   * Alias for payments.get().
   */
  getPayment(paymentId: string): Promise<PaymentResponse> {
    return this.payments.get(paymentId);
  }

  /**
   * Alias for payments.updateMetadata().
   */
  updatePaymentMetadata(
    paymentId: string,
    input: UpdatePaymentMetadataRequest,
  ): Promise<PaymentResponse> {
    return this.payments.updateMetadata(paymentId, input);
  }

  /**
   * Alias for customers.create().
   */
  createCustomer(input: CreateCustomerRequest): Promise<CustomerResponse> {
    return this.customers.create(input);
  }

  /**
   * Alias for customers.get().
   */
  getCustomer(customerId: string): Promise<CustomerResponse> {
    return this.customers.get(customerId);
  }

  /**
   * Alias for customers.getTransaction().
   */
  getCustomerTransaction(
    customerId: string,
    transactionId: string,
  ): Promise<CustomerTransactionResponse> {
    return this.customers.getTransaction(customerId, transactionId);
  }

  /**
   * Alias for refunds.create().
   */
  createRefund(
    paymentId: string,
    input: CreateRefundRequest,
  ): Promise<RefundResponse> {
    return this.payments.createRefund(paymentId, input);
  }

  /**
   * Alias for sandbox.simulateCvuTransfer().
   */
  simulateCvuTransfer(
    cvu: string,
    input: SimulateFaucetRequest,
  ): Promise<SimulateFaucetResponse> {
    return this.sandbox.simulateCvuTransfer(cvu, input);
  }
}
