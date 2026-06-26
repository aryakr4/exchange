import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { SUPPORTED_CURRENCY_CODES } from "@/features/alerts/constants";
import type { AlertDraftRaw } from "@/features/alerts/services/interpret";

const TOOL_NAME = "draft_alert";

const SYSTEM_PROMPT = [
  "You convert a person's plain-language money request into a structured currency-rate alert.",
  "Many users are sending remittances to family abroad.",
  "from_currency is the currency they hold/send FROM; to_currency is what the recipient gets / they send TO.",
  "condition greater_than = notify when 1 from-unit buys AT LEAST the target (good when sending money: more for each dollar).",
  "condition less_than = notify when it buys AT MOST the target.",
  "If they give no number (e.g. 'a better rate', 'more', 'cheaper to send'), set target_rate to null.",
  "Only use the supported currency codes. If they name an unsupported currency or the request is too vague to map, set clarification to a short, friendly sentence and still fill best-guess fields.",
].join(" ");

/**
 * Calls Claude with a strict, enum-constrained tool so the model can only emit
 * supported currency codes and the two valid conditions. Throws on transport
 * failure or a missing tool_use block; the caller treats that as a soft error.
 */
export async function parseAlertWithClaude(
  client: Anthropic,
  text: string,
): Promise<AlertDraftRaw> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tool_choice: { type: "tool", name: TOOL_NAME },
    tools: [
      {
        name: TOOL_NAME,
        description: "Record the exchange-rate alert the user described.",
        strict: true,
        input_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            from_currency: {
              type: "string",
              enum: SUPPORTED_CURRENCY_CODES as unknown as string[],
              description: "Currency the user holds / sends FROM.",
            },
            to_currency: {
              type: "string",
              enum: SUPPORTED_CURRENCY_CODES as unknown as string[],
              description: "Currency the recipient gets / they send TO.",
            },
            condition: {
              type: "string",
              enum: ["greater_than", "less_than"],
              description: "greater_than = at least the target; less_than = at most.",
            },
            target_rate: {
              anyOf: [{ type: "number" }, { type: "null" }],
              description: "Numeric target if the user gave one, else null.",
            },
            clarification: {
              anyOf: [{ type: "string" }, { type: "null" }],
              description: "Short question/explanation if ambiguous or unsupported, else null.",
            },
          },
          required: [
            "from_currency",
            "to_currency",
            "condition",
            "target_rate",
            "clarification",
          ],
        },
      },
    ],
    messages: [{ role: "user", content: text }],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Claude returned no tool_use block");
  }
  return block.input as AlertDraftRaw;
}
