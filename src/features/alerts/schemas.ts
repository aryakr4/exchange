import { z } from "zod";

import {
  SUPPORTED_CURRENCY_CODES,
  type SupportedCurrencyCode,
} from "@/features/alerts/constants";

const currencyEnum = z.enum(
  SUPPORTED_CURRENCY_CODES as [SupportedCurrencyCode, ...SupportedCurrencyCode[]],
  { error: "Select a currency" }
);

/**
 * Shared by the form resolver (client) and the Server Action (server), so
 * validation can never drift between the two. target_rate is coerced:
 * the input field submits a string, the database needs a number.
 */
export const createAlertSchema = z
  .object({
    from_currency: currencyEnum,
    to_currency: currencyEnum,
    target_rate: z.coerce
      .number({ error: "Enter a valid rate" })
      .positive("Target rate must be greater than 0")
      .lt(1e10, "Target rate is too large"),
    condition: z.enum(["greater_than", "less_than"], {
      error: "Select a condition",
    }),
  })
  .refine((data) => data.from_currency !== data.to_currency, {
    message: "Source and target currency must differ",
    path: ["to_currency"],
  });

/** What the form holds before validation (rate is still a string). */
export type CreateAlertFormInput = z.input<typeof createAlertSchema>;
/** What comes out of successful validation (rate is a number). */
export type CreateAlertInput = z.output<typeof createAlertSchema>;

export const alertIdSchema = z.uuid({ error: "Invalid alert id" });

export const toggleAlertSchema = z.object({
  id: alertIdSchema,
  active: z.boolean(),
});
