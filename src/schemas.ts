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
    transaction_fields: z.array(transactionFieldSchema).optional(),
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

export const createRefundRequestSchema = z
  .object({
    amount: numericAmountSchema.optional(),
    refund_type: z.enum(["FULL", "PARTIAL"]),
    motive: z.string().min(1),
    blame: z.enum(["CLIENT", "CUSTOMER", "THIRD_PARTY"]),
  })
  .superRefine((value, ctx) => {
    if (value.refund_type === "PARTIAL" && value.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "amount is required when refund_type is PARTIAL",
      });
    }
  });

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

export const paymentUpdatedWebhookEventSchema = z
  .object({
    message: z.string(),
    paymentId: z.string(),
    externalId: z.string(),
  })
  .passthrough();

export const customerPaymentWebhookEventSchema = z
  .object({
    message: z.string(),
    transactionId: z.string(),
    customerId: z.string(),
  })
  .passthrough();

export const webhookEventSchema = z.union([
  paymentUpdatedWebhookEventSchema,
  customerPaymentWebhookEventSchema,
]);

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
