import type { GoldenCase } from "./dataset";
import type { CaseScore, Summary } from "./score";

export interface CaseRow {
  case: GoldenCase;
  score: CaseScore;
  /** What the model actually returned, summarized for the report. */
  got: string;
}

/** One-line, terminal-friendly result for a single case. */
export function formatCaseLine(row: CaseRow): string {
  const mark = row.score.pass ? "PASS" : "FAIL";
  return `  ${mark}  [${row.case.category}] ${row.case.id} — ${row.got}`;
}

/** A Markdown report suitable for pasting into the README. */
export function formatMarkdownReport(
  summary: Summary,
  rows: CaseRow[],
  generatedAt: Date,
): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  const categoryRows = Object.entries(summary.byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, { passed, total }]) =>
        `| ${name} | ${passed}/${total} | ${pct(total === 0 ? 0 : passed / total)} |`,
    )
    .join("\n");

  const caseRows = rows
    .map(
      (row) =>
        `| ${row.score.pass ? "✅" : "❌"} | ${row.case.category} | \`${row.case.id}\` | ${escapePipes(
          row.case.input,
        )} | ${escapePipes(row.got)} |`,
    )
    .join("\n");

  return `# Interpret eval results

_Generated ${generatedAt.toISOString()} · model \`claude-haiku-4-5\` · ${summary.passed}/${summary.total} cases_

**Overall accuracy: ${pct(summary.accuracy)}**

| Category | Passed | Accuracy |
|---|---|---|
${categoryRows}

## Per-case

| | Category | Case | Input | Model output |
|---|---|---|---|---|
${caseRows}
`;
}

function escapePipes(text: string): string {
  return text.replace(/\|/g, "\\|");
}
