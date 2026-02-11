import { ZodError, type z } from "zod";
import { TaloError } from "./errors";
import type { FetchLike } from "../types";

export interface TaloHttpClientConfig {
  baseUrl: string;
  accessToken: string;
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
  private readonly accessToken: string;
  private readonly baseHeaders: HeadersInit | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(config: TaloHttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
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

    const headers = new Headers(this.baseHeaders);

    if (options.headers !== undefined) {
      const runtimeHeaders = new Headers(options.headers);
      runtimeHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    if (!headers.has("authorization")) {
      const token = this.accessToken.startsWith("Bearer ")
        ? this.accessToken
        : `Bearer ${this.accessToken}`;
      headers.set("authorization", token);
    }

    headers.set("accept", "application/json");

    if (validatedBody !== undefined) {
      headers.set("content-type", "application/json");
    }

    const init: RequestInit = {
      method: options.method,
      headers,
    };

    if (validatedBody !== undefined) {
      init.body = JSON.stringify(validatedBody);
    }

    if (options.signal !== undefined) {
      init.signal = options.signal;
    }

    const response = await this.fetchImpl(buildUrl(this.baseUrl, options.path), init);

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
