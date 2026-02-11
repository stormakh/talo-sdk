import { TaloHttpClient } from "../core/http";
import {
  createRefundRequestSchema,
  identifierSchema,
  refundResponseSchema,
} from "../schemas";
import type { CreateRefundRequest, RefundResponse } from "../types";

export class RefundsResource {
  constructor(private readonly httpClient: TaloHttpClient) {}

  /**
   * Create a refund for an existing payment.
   */
  async create(
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
