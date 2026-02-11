import type { z } from "zod";
import {
  apiErrorBodySchema,
  createCustomerRequestSchema,
  createPaymentRequestSchema,
  createRefundRequestSchema,
  customerPaymentWebhookEventSchema,
  customerResponseSchema,
  customerTransactionResponseSchema,
  faucetRequestSchema,
  faucetResponseSchema,
  paymentResponseSchema,
  paymentUpdatedWebhookEventSchema,
  refundResponseSchema,
  updatePaymentMetadataRequestSchema,
  webhookEventSchema,
} from "./schemas";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface TaloClientConfig {
  apiKey?: string | undefined;
  accessToken?: string | undefined;
  baseUrl?: string | undefined;
  headers?: HeadersInit | undefined;
  fetch?: FetchLike | undefined;
}

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
export type CustomerPaymentWebhookEvent = z.infer<
  typeof customerPaymentWebhookEventSchema
>;
export type TaloWebhookEvent = z.infer<typeof webhookEventSchema>;

export type TaloApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export interface ParsedWebhookPayload {
  rawBody: string;
  event: TaloWebhookEvent;
}

export interface WebhookVerificationOptions {
  secret: string;
  signature: string;
  algorithm?: "SHA-256";
}

export interface WebhookHandlerOptions {
  secret?: string;
  signatureHeader?: string;
  verifySignature?: (context: {
    request: Request;
    rawBody: string;
    signature: string | null;
  }) => boolean | Promise<boolean>;
  onPaymentUpdated?: (
    event: PaymentUpdatedWebhookEvent,
    request: Request,
  ) => void | Promise<void>;
  onCustomerPayment?: (
    event: CustomerPaymentWebhookEvent,
    request: Request,
  ) => void | Promise<void>;
  onEvent?: (event: TaloWebhookEvent, request: Request) => void | Promise<void>;
}
