import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { describe, it, expect } from "vitest";

import { parseAlertWithClaude } from "@/features/alerts/services/parse-claude";
import { GOLDEN_CASES, type GoldenCase } from "./dataset";
import {
  scoreCase,
  summarize,
  type CaseScore,
  type EvalCaseResult,
} from "./score";
import {
  formatCaseLine,
  formatMarkdownReport,
  type CaseRow,
} from "./report";

const apiKey = process.env.ANTHROPIC_API_KEY;
const MIN_ACCURACY = Number(process.env.EVAL_MIN_ACCURACY ?? "0.8");
const CONCURRENCY = 5;

/** Run `worker` over `items` with bounded concurrency, preserving order. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function describeOutput(score: CaseScore, raw: { from_currency: string; to_currency: string; condition: string; target_rate: number | null; clarification: string | null }): string {
  if (raw.clarification != null) {
    return `clarify: "${raw.clarification}"`;
  }
  const target = raw.target_rate == null ? "auto" : String(raw.target_rate);
  return `${raw.from_currency}→${raw.to_currency} ${raw.condition} ${target}`;
}

describe.skipIf(!apiKey)("interpret eval (live Claude)", () => {
  it(
    `maps plain-English requests at ≥ ${(MIN_ACCURACY * 100).toFixed(0)}% accuracy`,
    async () => {
      const client = new Anthropic({ apiKey });

      const rows = await mapPool<GoldenCase, CaseRow>(
        GOLDEN_CASES,
        CONCURRENCY,
        async (testCase) => {
          const raw = await parseAlertWithClaude(client, testCase.input);
          const score = scoreCase(testCase.expected, raw);
          return { case: testCase, score, got: describeOutput(score, raw) };
        },
      );

      const caseResults: EvalCaseResult[] = rows.map((row) => ({
        id: row.case.id,
        category: row.case.category,
        pass: row.score.pass,
      }));
      const summary = summarize(caseResults);

      // Human-readable run log.
      console.log("\n=== Interpret eval ===");
      for (const row of rows) console.log(formatCaseLine(row));
      console.log(
        `\nOverall: ${summary.passed}/${summary.total} = ${(summary.accuracy * 100).toFixed(1)}%`,
      );
      for (const [name, { passed, total }] of Object.entries(summary.byCategory)) {
        console.log(`  ${name}: ${passed}/${total}`);
      }

      // Persist a Markdown report for the README / portfolio.
      const here = path.dirname(fileURLToPath(import.meta.url));
      const reportPath = path.join(here, "results.md");
      writeFileSync(reportPath, formatMarkdownReport(summary, rows, new Date()));
      console.log(`\nReport written to ${reportPath}\n`);

      expect(summary.accuracy).toBeGreaterThanOrEqual(MIN_ACCURACY);
    },
    120_000,
  );
});
