import type { z } from "zod";
import {
  apiErrorBodySchema,
  authorizeRequestSchema,
  authorizeResponseSchema,
  createCustomerRequestSchema,
  createPaymentRequestSchema,
  createRefundRequestSchema,
  customerResponseSchema,
  customerTransactionResponseSchema,
  faucetRequestSchema,
  faucetResponseSchema,
  paymentResponseSchema,
  paymentUpdatedWebhookEventSchema,
  refundResponseSchema,
  updatePaymentMetadataRequestSchema,
} from "./schemas";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type TaloEnvironment = "production" | "sandbox";

export interface TaloClientConfig {
  clientId: string;
  clientSecret: string;
  userId: string;
  environment?: TaloEnvironment | undefined;
  baseUrl?: string | undefined;
  headers?: HeadersInit | undefined;
  fetch?: FetchLike | undefined;
}

export type AuthorizeRequest = z.infer<typeof authorizeRequestSchema>;
export type AuthorizeResponseEnvelope = z.infer<typeof authorizeResponseSchema>;
export type AuthorizeResponse = AuthorizeResponseEnvelope["data"];

export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;
export type UpdatePaymentMetadataRequest = z.infer<
  typeof updatePaymentMetadataRequestSchema
>;

export type PaymentResponseEnvelope = z.infer<typeof paymentResponseSchema>;
export type PaymentResponse = PaymentResponseEnvelope["data"];

export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;
export type CustomerResponseEnvelope = z.infer<typeof customerResponseSchema>;
export type CustomerResponse = CustomerResponseEnvelope["data"];

export type CustomerTransactionResponseEnvelope = z.infer<
  typeof customerTransactionResponseSchema
>;
export type CustomerTransactionResponse =
  CustomerTransactionResponseEnvelope["data"];

export type CreateRefundRequest = z.infer<typeof createRefundRequestSchema>;
export type RefundResponseEnvelope = z.infer<typeof refundResponseSchema>;
export type RefundResponse = RefundResponseEnvelope["data"];

export type SimulateFaucetRequest = z.infer<typeof faucetRequestSchema>;
export type SimulateFaucetResponse = z.infer<typeof faucetResponseSchema>;

export type PaymentUpdatedWebhookEvent = z.infer<
  typeof paymentUpdatedWebhookEventSchema
>;
export type TaloWebhookEvent = PaymentUpdatedWebhookEvent;

export type TaloApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export interface ParsedWebhookPayload {
  rawBody: string;
  event: PaymentUpdatedWebhookEvent;
}

export interface WebhookHandlerOptions {
  onPaymentUpdated?: (
    context: {
      event: PaymentUpdatedWebhookEvent;
      payment: PaymentResponse;
      request: Request;
    },
  ) => void | Promise<void>;
}
