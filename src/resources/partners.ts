import { TaloHttpClient } from "../core/http";
import {
  identifierSchema,
  partnerAccountResponseSchema,
  partnerTokenExchangeRequestSchema,
  partnerTokenExchangeResponseSchema,
  updatePartnerAccountRequestSchema,
} from "../schemas";
import type {
  PartnerAccountResponse,
  PartnerAuthorizationUrlOptions,
  PartnerTokenExchangeRequest,
  PartnerTokenExchangeResponse,
  UpdatePartnerAccountRequest,
} from "../types";

const TALO_PARTNER_AUTHORIZE_BASE_URL = "https://app.talo.com.ar/authorize";

export class PartnersResource {
  constructor(private readonly httpClient: TaloHttpClient) {}

  /**
   * Build the partner onboarding authorization URL used to redirect end users.
   */
  getAuthorizationUrl(
    partnerId: string,
    options: PartnerAuthorizationUrlOptions = {},
  ): string {
    const parsedPartnerId = identifierSchema.parse(partnerId);
    const url = new URL(
      `${TALO_PARTNER_AUTHORIZE_BASE_URL}/${encodeURIComponent(parsedPartnerId)}`,
    );

    if (options.referredUserId !== undefined) {
      url.searchParams.set(
        "referred_user_id",
        identifierSchema.parse(options.referredUserId),
      );
    }

    return url.toString();
  }

  /**
   * Exchange the redirect `code` for a partner access token and mapped user IDs.
   */
  async exchangeToken(
    input: PartnerTokenExchangeRequest,
  ): Promise<PartnerTokenExchangeResponse> {
    const response = await this.httpClient.request({
      method: "POST",
      path: "/auth/tokens",
      auth: "none",
      body: input,
      requestSchema: partnerTokenExchangeRequestSchema,
      responseSchema: partnerTokenExchangeResponseSchema,
    });

    return response.data;
  }

  /**
   * Fetch account activation and payout configuration for a user.
   */
  async getAccount(userId: string): Promise<PartnerAccountResponse> {
    const parsedUserId = identifierSchema.parse(userId);

    const response = await this.httpClient.request({
      method: "GET",
      path: `/users/${parsedUserId}/account`,
      responseSchema: partnerAccountResponseSchema,
    });

    return response.data;
  }

  /**
   * Update account-level configuration such as alias prefix and payout schedule.
   */
  async updateAccount(
    userId: string,
    input: UpdatePartnerAccountRequest,
  ): Promise<PartnerAccountResponse> {
    const parsedUserId = identifierSchema.parse(userId);

    const response = await this.httpClient.request({
      method: "PATCH",
      path: `/users/${parsedUserId}`,
      body: input,
      requestSchema: updatePartnerAccountRequestSchema,
      responseSchema: partnerAccountResponseSchema,
    });

    return response.data;
  }
}
