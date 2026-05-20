import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist/esm",
  outExtension: () => ({ js: ".mjs" }),
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  external: [
    "@hashgraph/hedera-agent-kit",
    "@hiero-ledger/sdk",
    "@google/generative-ai",
    "chalk",
    "zod",
    "dotenv",
  ],
});
