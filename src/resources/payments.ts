import { TaloHttpClient } from "../core/http";
import {
  createRefundRequestSchema,
  createPaymentRequestSchema,
  identifierSchema,
  paymentResponseSchema,
  refundResponseSchema,
  updatePaymentMetadataRequestSchema,
} from "../schemas";
import type {
  CreatePaymentRequest,
  CreateRefundRequest,
  PaymentResponse,
  RefundResponse,
  UpdatePaymentMetadataRequest,
} from "../types";

export class PaymentsResource {
  constructor(private readonly httpClient: TaloHttpClient) {}

  /**
   * Create a payment request and obtain transfer instructions.
   */
  async create(input: CreatePaymentRequest): Promise<PaymentResponse> {
    const response = await this.httpClient.request({
      method: "POST",
      path: "/payments/",
      body: input,
      requestSchema: createPaymentRequestSchema,
      responseSchema: paymentResponseSchema,
    });

    return response.data;
  }

  /**
   * Retrieve a payment by ID and inspect its current status.
   */
  async get(paymentId: string): Promise<PaymentResponse> {
    const parsedPaymentId = identifierSchema.parse(paymentId);

    const response = await this.httpClient.request({
      method: "GET",
      path: `/payments/${parsedPaymentId}`,
      responseSchema: paymentResponseSchema,
    });

    return response.data;
  }

  /**
   * Set the cancellation reason for an expired payment.
   */
  async updateMetadata(
    paymentId: string,
    input: UpdatePaymentMetadataRequest,
  ): Promise<PaymentResponse> {
    const parsedPaymentId = identifierSchema.parse(paymentId);

    const response = await this.httpClient.request({
      method: "PUT",
      path: `/payments/${parsedPaymentId}/metadata`,
      body: input,
      requestSchema: updatePaymentMetadataRequestSchema,
      responseSchema: paymentResponseSchema,
    });

    return response.data;
  }

  /**
   * Create a refund for a payment.
   */
  async createRefund(
    paymentId: string,
    input: CreateRefundRequest,
  ): Promise<RefundResponse> {
    const parsedPaymentId = identifierSchema.parse(paymentId);

    const response = await this.httpClient.request({
      method: "POST",
      path: `/payments/${parsedPaymentId}/refunds`,
      body: input,
      requestSchema: createRefundRequestSchema,
      responseSchema: refundResponseSchema,
    });

    return response.data;
  }
}
