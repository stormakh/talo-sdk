import { z } from "zod";

export const taloBaseUrlSchema = z.string().url();
export const identifierSchema = z.string().min(1, "Identifier is required");

export const currencySchema = z.enum(["ARS"]);
export const paymentOptionSchema = z.enum(["transfer"]);
export const paymentStatusSchema = z.enum([
  "PENDING",
  "SUCCESS",
  "OVERPAID",
  "UNDERPAID",
  "EXPIRED",
]);
export const transactionStatusSchema = z.enum(["PROCESSED"]);

export const numericAmountSchema = z.union([
  z.number(),
  z.string().regex(/^-?\d+(\.\d+)?$/, "Amount must be a numeric string"),
]);

export const priceSchema = z.object({
  amount: numericAmountSchema,
  currency: currencySchema,
});

export const createPaymentPriceSchema = z.object({
  amount: z.number(),
  currency: currencySchema,
});

export const clientDataSchema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    dni: z.string().min(1),
    cuit: z.string().min(1),
  })
  .partial();

export const authorizeRequestSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const authorizeDataSchema = z
  .object({
    token: z.string().min(1),
  })
  .passthrough();

export const partnerTokenExchangeRequestSchema = z.object({
  code: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
}).strict();

export const partnerTokenExchangeDataSchema = z
  .object({
    token: z.string().min(1),
    user_id: z.string().min(1),
    referred_user_id: z.string().optional(),
  })
  .passthrough();

export const payoutFrequencySchema = z.enum([
  "bi_daily",
  "daily",
  "weekly",
  "monthly",
]);

export const payoutScheduleSchema = z
  .object({
    address: z.string().min(1),
    frequency: payoutFrequencySchema,
  })
  .strict();

export const partnerConfigSchema = z
  .object({
    commission: z.number().optional(),
    partner_id: z.string().optional(),
    partner_name: z.string().optional(),
    partner_slug: z.string().optional(),
  })
  .passthrough();

export const partnerAccountSchema = z
  .object({
    account_status: z.enum(["ACTIVE", "PENDING", "REJECTED", "SUSPENDED"]).optional(),
    alias_prefix: z.string().optional(),
    cancellation_period: z.number().int().optional(),
    transfer_tolerance: z.number().int().optional(),
    payout_schedule: payoutScheduleSchema.optional(),
    user_id: z.string().optional(),
    partner_config: partnerConfigSchema.optional(),
  })
  .passthrough();

export const updatePartnerAccountRequestSchema = z
  .object({
    alias_prefix: z
      .string()
      .min(1)
      .max(8)
      .regex(
        /^[a-z0-9_]+$/,
        "alias_prefix must contain lowercase letters, numbers or underscore",
      )
      .optional(),
    cancellation_period: z.number().int().min(1).max(200).optional(),
    transfer_tolerance: z.number().int().min(0).max(10000).optional(),
    payout_schedule: payoutScheduleSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for account update",
  });

export const createPaymentRequestSchema = z.object({
  user_id: z.string().min(1),
  price: createPaymentPriceSchema,
  payment_options: z.array(paymentOptionSchema).min(1),
  external_id: z.string().min(1),
  webhook_url: z.string().url(),
  redirect_url: z.string().url().optional(),
  motive: z.string().min(1).optional(),
  client_data: clientDataSchema.optional(),
});

export const updatePaymentMetadataRequestSchema = z.object({
  motive: z.string().min(1),
});

export const quoteSchema = z
  .object({
    amount: numericAmountSchema.optional(),
    network: z.string().optional(),
    currency: z.string().optional(),
    address: z.string().optional(),
    cvu: z.string().optional(),
    alias: z.string().optional(),
  })
  .passthrough();

export const transactionFieldSchema = z
  .object({
    amount: numericAmountSchema.optional(),
    cvu: z.string().optional(),
    alias: z.string().optional(),
  })
  .passthrough();

export const transactionSchema = z
  .object({
    amount: numericAmountSchema.optional(),
    currency: z.string().optional(),
    payment_date: z.string().optional(),
    beneficiary_name: z.string().optional(),
    cuit: z.string().optional(),
    cbu: z.string().optional(),
    cvu: z.string().optional(),
    alias: z.string().optional(),
  })
  .passthrough();

export const paymentSchema = z
  .object({
    id: z.string(),
    payment_status: paymentStatusSchema,
    user_id: z.string().optional(),
    quotes: z.array(quoteSchema).optional(),
    transaction_fields: transactionFieldSchema.optional(),
    transactions: z.array(transactionSchema).optional(),
    payment_url: z.string().url().optional(),
    external_id: z.string().optional(),
    expiration_timestamp: z.string().optional(),
    creation_timestamp: z.string().optional(),
    last_modified_timestamp: z.string().optional(),
    price: priceSchema.optional(),
    payment_options: z.array(paymentOptionSchema).optional(),
    webhook_url: z.string().optional(),
    redirect_url: z.string().optional(),
    motive: z.string().optional(),
    client_data: clientDataSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const bankInfoSchema = z
  .object({
    cvu: z.string().optional(),
    cbu: z.string().optional(),
    alias: z.string().optional(),
  })
  .passthrough();

export const createCustomerRequestSchema = z.object({
  user_id: z.string().min(1),
  full_name: z.string().min(1),
  document_id: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  cvu: z.string().optional(),
  cbu: z.string().optional(),
  alias: z.string().optional(),
});

export const customerSchema = z
  .object({
    customer_id: z.string(),
    user_id: z.string().optional(),
    full_name: z.string().optional(),
    document_id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    bank_info: bankInfoSchema.optional(),
    balance: numericAmountSchema.optional(),
    creation_timestamp: z.string().optional(),
    update_timestamp: z.string().optional(),
  })
  .passthrough();

export const customerTransactionSchema = z
  .object({
    transaction_id: z.string().optional(),
    payment_id: z.string().optional(),
    status: z.string().optional(),
    amount: numericAmountSchema.optional(),
    currency: z.string().optional(),
    creation_timestamp: z.string().optional(),
  })
  .passthrough();

export const refundBlameSchema = z.object({
  team_id: z.string().min(1),
  mail: z.string().min(1),
}).strict();

const fullRefundRequestSchema = z.object({
  refund_type: z.literal("FULL"),
  blame: refundBlameSchema,
  user_id: z.string().min(1),
}).strict();

const partialRefundRequestSchema = z.object({
  refund_type: z.literal("PARTIAL"),
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "amount must be a numeric string"),
  currency: currencySchema,
  blame: refundBlameSchema,
  user_id: z.string().min(1),
}).strict();

export const createRefundRequestSchema = z.discriminatedUnion("refund_type", [
  fullRefundRequestSchema,
  partialRefundRequestSchema,
]);

export const refundSchema = z
  .object({
    refund_id: z.string().optional(),
    payment_id: z.string().optional(),
    amount: numericAmountSchema.optional(),
    currency: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

export const faucetRequestSchema = z.object({
  amount: numericAmountSchema,
});

export const faucetResponseSchema = z
  .object({
    status: z.string().optional(),
    message: z.string().optional(),
    detail: z.string().optional(),
  })
  .passthrough();

export const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      message: z.string().optional(),
      status: z.string().optional(),
      error: z.boolean().optional(),
      code: z.number().optional(),
      data: dataSchema,
    })
    .passthrough();

export const paymentResponseSchema = successEnvelopeSchema(paymentSchema);
export const customerResponseSchema = successEnvelopeSchema(customerSchema);
export const customerTransactionResponseSchema = successEnvelopeSchema(
  customerTransactionSchema,
);
export const refundResponseSchema = successEnvelopeSchema(refundSchema);
export const authorizeResponseSchema = successEnvelopeSchema(authorizeDataSchema);
export const partnerTokenExchangeResponseSchema = successEnvelopeSchema(
  partnerTokenExchangeDataSchema,
);
export const partnerAccountResponseSchema = successEnvelopeSchema(partnerAccountSchema);

export const paymentUpdatedWebhookEventSchema = z
  .object({
    message: z.string(),
    paymentId: z.string(),
    externalId: z.string(),
  })
  .passthrough();

export const webhookEventSchema = paymentUpdatedWebhookEventSchema;

export const apiErrorBodySchema = z
  .object({
    status: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
    error: z.union([z.string(), z.boolean()]).optional(),
    code: z.union([z.number(), z.string()]).optional(),
    errors: z.unknown().optional(),
    detail: z.string().optional(),
  })
  .passthrough();
