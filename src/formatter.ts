import chalk from "chalk";
import type { CourtVerdict, JudgeVerdict, SealResult } from "./types.js";

const DIVIDER = chalk.dim("─".repeat(60));
const THICK_DIVIDER = chalk.yellow("═".repeat(60));

const JUDGE_ICONS: Record<string, string> = {
  vera: "⚖️ ",
  marco: "🕊️ ",
  cipher: "😈",
};

const JUDGE_TITLES: Record<string, string> = {
  vera: "Judge Vera — The Logician",
  marco: "Judge Marco — The Humanist",
  cipher: "Judge Cipher — The Devil's Advocate",
};

const VOTE_COLORS: Record<string, (s: string) => string> = {
  A: chalk.cyan,
  B: chalk.magenta,
  neither: chalk.gray,
};

function formatJudge(v: JudgeVerdict): string {
  const icon = JUDGE_ICONS[v.judge];
  const title = JUDGE_TITLES[v.judge];
  const voteLabel = v.vote === "A" ? "PARTY A" : v.vote === "B" ? "PARTY B" : "NEITHER";
  const colorFn = VOTE_COLORS[v.vote] ?? chalk.white;

  return [
    `  ${icon}  ${chalk.bold(title)}`,
    `  ${chalk.dim("Ruling:")} ${colorFn(chalk.bold(voteLabel))}`,
    `  ${chalk.dim("Reasoning:")} ${v.reasoning}`,
    `  ${chalk.italic.dim(`"${v.signature}"`)  }`,
  ].join("\n");
}

export function displayVerdict(v: CourtVerdict): void {
  console.log("\n" + THICK_DIVIDER);
  console.log(chalk.yellow.bold("  ⚖️  HEDERA AI COURT — CASE " + v.caseId));
  console.log(THICK_DIVIDER);

  console.log(`\n  ${chalk.bold("Question:")} ${v.question}`);
  console.log(`  ${chalk.cyan("Party A:")} ${v.positionA}`);
  console.log(`  ${chalk.magenta("Party B:")} ${v.positionB}`);

  console.log("\n" + DIVIDER);
  console.log(chalk.bold("  JUDICIAL PANEL DELIBERATIONS"));
  console.log(DIVIDER);

  const judges = [v.judges.vera, v.judges.marco, v.judges.cipher];
  for (const j of judges) {
    console.log("\n" + formatJudge(j));
  }

  console.log("\n" + THICK_DIVIDER);

  const verdictColor =
    v.verdict === "Party A" ? chalk.cyan.bold
    : v.verdict === "Party B" ? chalk.magenta.bold
    : chalk.yellow.bold;

  console.log(chalk.bold("  ⚖️  FINAL VERDICT  (" + v.tally + ")"));
  console.log(`\n  ${verdictColor("  ▶  " + v.verdict.toUpperCase() + "  ◀  ")}`);
  console.log(`\n  ${chalk.dim("Majority reasoning:")} ${v.majorityReasoning}`);

  if (v.dissent) {
    console.log("\n" + DIVIDER);
    console.log(`  ${chalk.dim("Dissenting opinion:")} ${chalk.italic(v.dissent)}`);
  }

  console.log("\n" + THICK_DIVIDER + "\n");
}

export function displaySealConfirmation(sealResult: SealResult, caseId: string): void {
  console.log("\n" + chalk.green("  ✅  Verdict sealed on Hedera Consensus Service"));
  console.log(`  ${chalk.dim("Case:")}     ${chalk.bold(caseId)}`);
  console.log(`  ${chalk.dim("Topic ID:")} ${sealResult.topicId}`);
  console.log(`  ${chalk.dim("Sequence:")} #${sealResult.sequenceNumber}`);
  console.log(`  ${chalk.dim("Explorer:")} ${chalk.underline.cyan(sealResult.hashscanUrl)}`);
  console.log("\n  " + chalk.dim("This verdict is permanent. It cannot be altered or deleted.\n"));
}

export function displayWelcome(): void {
  console.log("\n" + THICK_DIVIDER);
  console.log(chalk.yellow.bold("  ⚖️  HEDERA AI COURT"));
  console.log(chalk.dim("  Every dispute deserves a verdict."));
  console.log(chalk.dim("  Every verdict deserves to last forever."));
  console.log(THICK_DIVIDER);
  console.log(`
  Three judges. One truth. Sealed on Hedera.

  ${chalk.bold("⚖️  Judge Vera")}   — The Logician
  ${chalk.bold("🕊️  Judge Marco")}  — The Humanist
  ${chalk.bold("😈 Judge Cipher")} — The Devil's Advocate

  ${chalk.dim("Type your dispute and press Enter.")}
  ${chalk.dim('Type "exit" or press Ctrl+C to leave the court.\n')}
`);
}

export function displayProcessing(): void {
  console.log(chalk.dim("\n  The judges are deliberating...\n"));
}

export function displayError(message: string): void {
  console.error(chalk.red(`\n  ✗ Error: ${message}\n`));
}
