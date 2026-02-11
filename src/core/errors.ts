import { apiErrorBodySchema } from "../schemas";
import type { TaloApiErrorBody } from "../types";

export interface TaloErrorOptions {
  statusCode?: number | undefined;
  errorCode?: number | string | undefined;
  details?: unknown;
  requestId?: string | undefined;
  cause?: unknown;
  rawBody?: string | undefined;
}

/** Error returned by Talo endpoints with parsed API metadata. */
export class TaloError extends Error {
  readonly statusCode: number | undefined;
  readonly errorCode: number | string | undefined;
  readonly details: unknown;
  readonly requestId: string | undefined;
  readonly rawBody: string | undefined;

  constructor(message: string, options: TaloErrorOptions = {}) {
    super(message);
    this.name = "TaloError";
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode;
    this.details = options.details;
    this.requestId = options.requestId;
    this.rawBody = options.rawBody;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }

  static fromApiError(
    statusCode: number,
    body: unknown,
    requestId?: string,
    rawBody?: string,
  ): TaloError {
    const parsed = apiErrorBodySchema.safeParse(body);

    if (!parsed.success) {
      return new TaloError(
        `Talo API request failed with HTTP ${statusCode}`,
        {
          statusCode,
          requestId,
          details: body,
          rawBody,
        },
      );
    }

    const errorBody: TaloApiErrorBody = parsed.data;
    const message =
      errorBody.message ??
      (typeof errorBody.error === "string" ? errorBody.error : undefined) ??
      errorBody.detail ??
      `Talo API request failed with HTTP ${statusCode}`;

    return new TaloError(message, {
      statusCode,
      errorCode: errorBody.code,
      details: errorBody.errors,
      requestId,
      rawBody,
    });
  }
}
