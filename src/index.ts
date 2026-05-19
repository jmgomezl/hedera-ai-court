import "dotenv/config";
import * as readline from "readline";
import { createCourtAgent } from "./agent.js";
import { extractCaseInput, orchestrateCourt } from "./court.js";
import { sealVerdict, loadCasesStore, nextCaseId, saveCasesStore } from "./hcs.js";
import {
  displayWelcome,
  displayProcessing,
  displayVerdict,
  displaySealConfirmation,
  displayError,
} from "./formatter.js";
import chalk from "chalk";

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  const accountId = getEnv("HEDERA_ACCOUNT_ID");
  const privateKey = getEnv("HEDERA_PRIVATE_KEY");
  const googleApiKey = getEnv("GOOGLE_API_KEY");
  const network = process.env.HEDERA_NETWORK ?? "testnet";

  const { client } = createCourtAgent(accountId, privateKey, network, googleApiKey);

  displayWelcome();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  rl.on("close", () => {
    console.log(chalk.dim("\n\n  Court adjourned.\n"));
    process.exit(0);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const input = (await question(rl, chalk.yellow("  ⚖️  Your dispute > "))).trim();

    if (!input) continue;
    if (input.toLowerCase() === "exit") {
      rl.close();
      break;
    }

    try {
      displayProcessing();

      const store = loadCasesStore();
      const caseId = nextCaseId(store);

      const caseInput = await extractCaseInput(input, googleApiKey);
      const verdict = await orchestrateCourt(caseInput, caseId, googleApiKey);

      displayVerdict(verdict);

      const confirm = (
        await question(
          rl,
          chalk.dim("  Seal this verdict permanently on Hedera? (~0.5 HBAR) (yes/no) > ")
        )
      )
        .trim()
        .toLowerCase();

      if (confirm === "yes" || confirm === "y") {
        console.log(chalk.dim("\n  Submitting to Hedera Consensus Service..."));

        const sealResult = await sealVerdict(client, verdict, network);
        displaySealConfirmation(sealResult, caseId);
      } else {
        store.nextCaseNumber += 1;
        saveCasesStore(store);
        console.log(chalk.dim("\n  Verdict recorded locally. Not sealed on-chain.\n"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      displayError(message);
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
