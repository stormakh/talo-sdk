import { TaloHttpClient } from "../core/http";
import {
  createCustomerRequestSchema,
  customerResponseSchema,
  customerTransactionResponseSchema,
  identifierSchema,
} from "../schemas";
import type {
  CreateCustomerRequest,
  CustomerResponse,
  CustomerTransactionResponse,
} from "../types";

export class CustomersResource {
  constructor(private readonly httpClient: TaloHttpClient) {}

  /**
   * Register a customer (wallet) to receive incoming transfers.
   */
  async create(input: CreateCustomerRequest): Promise<CustomerResponse> {
    const response = await this.httpClient.request({
      method: "POST",
      path: "/customers/",
      body: input,
      requestSchema: createCustomerRequestSchema,
      responseSchema: customerResponseSchema,
    });

    return response.data;
  }

  /**
   * Retrieve a customer by ID.
   */
  async get(customerId: string): Promise<CustomerResponse> {
    const parsedCustomerId = identifierSchema.parse(customerId);

    const response = await this.httpClient.request({
      method: "GET",
      path: `/customers/${parsedCustomerId}`,
      responseSchema: customerResponseSchema,
    });

    return response.data;
  }

  /**
   * Retrieve one incoming transfer transaction for a customer.
   */
  async getTransaction(
    customerId: string,
    transactionId: string,
  ): Promise<CustomerTransactionResponse> {
    const parsedCustomerId = identifierSchema.parse(customerId);
    const parsedTransactionId = identifierSchema.parse(transactionId);

    const response = await this.httpClient.request({
      method: "GET",
      path: `/customers/${parsedCustomerId}/transactions/${parsedTransactionId}`,
      responseSchema: customerTransactionResponseSchema,
    });

    return response.data;
  }
}
