import { ZodError } from "zod";
import {
  authorizeRequestSchema,
  authorizeResponseSchema,
  taloBaseUrlSchema,
} from "../schemas";
import { TaloError } from "./errors";
import type { FetchLike } from "../types";

const ONE_HOUR_MS = 60 * 60 * 1000;
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export interface TaloTokenManagerConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  userId: string;
  headers?: HeadersInit | undefined;
  fetch?: FetchLike | undefined;
}

export interface AccessTokenProvider {
  getAccessToken(options?: { forceRefresh?: boolean }): Promise<string>;
}

function buildAuthUrl(baseUrl: string, userId: string): string {
  const normalizedBaseUrl = taloBaseUrlSchema.parse(baseUrl).replace(/\/$/, "");
  return `${normalizedBaseUrl}/users/${encodeURIComponent(userId)}/tokens`;
}

function parseResponseBody(raw: string): unknown {
  if (raw.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function decodeBase64Url(value: string): string | undefined {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const base64 = `${normalized}${padding}`;

  if (typeof atob === "function") {
    return atob(base64);
  }

  return undefined;
}

function extractJwtExpirationTimestamp(token: string): number | undefined {
  const parts = token.split(".");
  const payloadPart = parts[1];

  if (payloadPart === undefined) {
    return undefined;
  }

  try {
    const payload = decodeBase64Url(payloadPart);
    if (payload === undefined) {
      return undefined;
    }

    const decoded = JSON.parse(payload) as { exp?: unknown };
    if (typeof decoded.exp !== "number" || !Number.isFinite(decoded.exp)) {
      return undefined;
    }

    return decoded.exp * 1000;
  } catch {
    return undefined;
  }
}

export class TaloTokenManager implements AccessTokenProvider {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly userId: string;
  private readonly baseHeaders: HeadersInit | undefined;
  private readonly fetchImpl: FetchLike;

  private token: string | undefined;
  private tokenExpiresAt: number | undefined;
  private refreshInFlight: Promise<string> | undefined;

  constructor(config: TaloTokenManagerConfig) {
    this.baseUrl = config.baseUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.userId = config.userId;
    this.baseHeaders = config.headers;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async getAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string> {
    const forceRefresh = options.forceRefresh ?? false;

    if (!forceRefresh && this.hasValidToken()) {
      return this.token as string;
    }

    if (this.refreshInFlight !== undefined) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.fetchToken();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = undefined;
    }
  }

  private hasValidToken(): boolean {
    if (this.token === undefined || this.tokenExpiresAt === undefined) {
      return false;
    }

    return Date.now() < this.tokenExpiresAt - REFRESH_WINDOW_MS;
  }

  private async fetchToken(): Promise<string> {
    const requestBody = authorizeRequestSchema.parse({
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const headers = new Headers(this.baseHeaders);
    headers.delete("authorization");
    headers.set("accept", "application/json");
    headers.set("content-type", "application/json");

    const response = await this.fetchImpl(buildAuthUrl(this.baseUrl, this.userId), {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const rawBody = await response.text();
    const parsedBody = parseResponseBody(rawBody);
    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      throw TaloError.fromApiError(
        response.status,
        parsedBody,
        requestId,
        rawBody.length > 0 ? rawBody : undefined,
      );
    }

    try {
      const parsed = authorizeResponseSchema.parse(parsedBody);
      const token = parsed.data.token;
      const expiresAt = extractJwtExpirationTimestamp(token);

      this.token = token;
      this.tokenExpiresAt =
        expiresAt !== undefined && expiresAt > Date.now()
          ? expiresAt
          : Date.now() + ONE_HOUR_MS;

      return token;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TaloError("Unexpected response from Talo auth endpoint", {
          statusCode: response.status,
          requestId,
          details: error.flatten(),
          rawBody: rawBody.length > 0 ? rawBody : undefined,
          cause: error,
        });
      }

      throw error;
    }
  }
}
