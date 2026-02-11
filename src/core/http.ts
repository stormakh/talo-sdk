import { ZodError, type z } from "zod";
import { TaloError } from "./errors";
import type { FetchLike } from "../types";
import type { AccessTokenProvider } from "./auth";

export interface TaloHttpClientConfig {
  baseUrl: string;
  tokenProvider: AccessTokenProvider;
  headers?: HeadersInit | undefined;
  fetch?: FetchLike | undefined;
}

export interface TaloRequestOptions<
  TRequestSchema extends z.ZodTypeAny | undefined,
  TResponseSchema extends z.ZodTypeAny,
> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: HeadersInit;
  requestSchema?: TRequestSchema;
  responseSchema: TResponseSchema;
  signal?: AbortSignal;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function buildUrl(baseUrl: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(normalizePath(path), `${baseUrl.replace(/\/$/, "")}/`).toString();
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

export class TaloHttpClient {
  private readonly baseUrl: string;
  private readonly tokenProvider: AccessTokenProvider;
  private readonly baseHeaders: HeadersInit | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(config: TaloHttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.tokenProvider = config.tokenProvider;
    this.baseHeaders = config.headers;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async request<
    TRequestSchema extends z.ZodTypeAny | undefined,
    TResponseSchema extends z.ZodTypeAny,
  >(
    options: TaloRequestOptions<TRequestSchema, TResponseSchema>,
  ): Promise<z.infer<TResponseSchema>> {
    const validatedBody =
      options.requestSchema !== undefined && options.body !== undefined
        ? options.requestSchema.parse(options.body)
        : options.body;

    const requestBody =
      validatedBody === undefined ? undefined : JSON.stringify(validatedBody);

    const baseHeaders = new Headers(this.baseHeaders);

    if (options.headers !== undefined) {
      const runtimeHeaders = new Headers(options.headers);
      runtimeHeaders.forEach((value, key) => {
        baseHeaders.set(key, value);
      });
    }

    const hasCustomAuthorization = baseHeaders.has("authorization");

    const executeRequest = async (
      authorizationToken: string | undefined,
    ): Promise<Response> => {
      const headers = new Headers(baseHeaders);

      if (!hasCustomAuthorization && authorizationToken !== undefined) {
        const token = authorizationToken.startsWith("Bearer ")
          ? authorizationToken
          : `Bearer ${authorizationToken}`;
        headers.set("authorization", token);
      }

      headers.set("accept", "application/json");

      if (requestBody !== undefined) {
        headers.set("content-type", "application/json");
      }

      const init: RequestInit = {
        method: options.method,
        headers,
      };

      if (requestBody !== undefined) {
        init.body = requestBody;
      }

      if (options.signal !== undefined) {
        init.signal = options.signal;
      }

      return this.fetchImpl(buildUrl(this.baseUrl, options.path), init);
    };

    const initialToken = hasCustomAuthorization
      ? undefined
      : await this.tokenProvider.getAccessToken();

    let response = await executeRequest(initialToken);

    if (response.status === 401 && !hasCustomAuthorization) {
      const refreshedToken = await this.tokenProvider.getAccessToken({
        forceRefresh: true,
      });
      response = await executeRequest(refreshedToken);
    }

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
      return options.responseSchema.parse(parsedBody);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TaloError("Unexpected response from Talo API", {
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
