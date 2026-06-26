import path from "node:path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Make .env.local secrets (ANTHROPIC_API_KEY) visible to the eval, the same way
// `next dev` does. Vite only exposes prefixed vars by default; "" loads all.
const fileEnv = loadEnv("development", process.cwd(), "");

if (!fileEnv.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n[eval] ANTHROPIC_API_KEY is unset — the live interpret eval will skip." +
      "\n[eval] Set it in .env.local, or run: ANTHROPIC_API_KEY=sk-... npm run eval\n",
  );
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // parse-claude.ts imports the `server-only` poison package; the eval runs
      // it outside a React Server environment, so stub it as the tests do.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    // Real network calls to Claude — kept out of the default `npm test` run,
    // which only globs *.{test,spec}.* files.
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    testTimeout: 120_000,
    // Forwarded into the worker process so the eval can read ANTHROPIC_API_KEY.
    env: fileEnv,
  },
});
