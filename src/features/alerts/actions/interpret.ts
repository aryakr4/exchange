"use server";

import { getLatestRate } from "@/lib/exchange-rates/service";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { createClient } from "@/lib/supabase/server";
import { parseAlertWithClaude } from "@/features/alerts/services/parse-claude";
import {
  interpretAlertDraft,
  type InterpretResult,
} from "@/features/alerts/services/interpret";

export async function interpretAlert(input: {
  text: string;
}): Promise<InterpretResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "You must be logged in." };
  }

  const client = createAnthropicClient();
  if (!client) {
    return {
      status: "error",
      message: "Plain-English setup isn't available — use the fields below.",
    };
  }

  return interpretAlertDraft(input?.text ?? "", {
    parse: (text) => parseAlertWithClaude(client, text),
    getRate: async (from, to) => (await getLatestRate(from, to)).rate,
  });
}
