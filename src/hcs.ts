import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { CasesStore, CourtVerdict, SealResult } from "./types.js";

const CASES_PATH = resolve(process.cwd(), "cases.json");

export function loadCasesStore(): CasesStore {
  if (!existsSync(CASES_PATH)) {
    const initial: CasesStore = { topicId: null, nextCaseNumber: 1, cases: [] };
    writeFileSync(CASES_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(readFileSync(CASES_PATH, "utf-8")) as CasesStore;
}

export function saveCasesStore(store: CasesStore): void {
  writeFileSync(CASES_PATH, JSON.stringify(store, null, 2));
}

export function nextCaseId(store: CasesStore): string {
  return `HAC-${String(store.nextCaseNumber).padStart(4, "0")}`;
}

async function createTopic(client: Client): Promise<string> {
  const tx = new TopicCreateTransaction().setTopicMemo("Hedera AI Court — Sealed Verdicts");
  const receipt = await (await tx.execute(client)).getReceipt(client);
  return receipt.topicId!.toString();
}

export async function sealVerdict(
  client: Client,
  verdict: CourtVerdict,
  network: string
): Promise<SealResult> {
  const store = loadCasesStore();

  if (!store.topicId) {
    store.topicId = await createTopic(client);
    saveCasesStore(store);
  }

  const hcsPayload = {
    court: "Hedera AI Court",
    case_id: verdict.caseId,
    timestamp: verdict.timestamp,
    question: verdict.question,
    verdict: verdict.verdict,
    vote_tally: verdict.tally,
    judges: {
      vera: {
        vote: verdict.judges.vera.vote,
        reasoning: verdict.judges.vera.reasoning,
        signature: verdict.judges.vera.signature,
      },
      marco: {
        vote: verdict.judges.marco.vote,
        reasoning: verdict.judges.marco.reasoning,
        signature: verdict.judges.marco.signature,
      },
      cipher: {
        vote: verdict.judges.cipher.vote,
        reasoning: verdict.judges.cipher.reasoning,
        signature: verdict.judges.cipher.signature,
      },
    },
    majority_reasoning: verdict.majorityReasoning,
    dissent: verdict.dissent ?? null,
  };

  const message = JSON.stringify(hcsPayload);
  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(store.topicId)
    .setMessage(message);

  const receipt = await (await tx.execute(client)).getReceipt(client);
  const seqNum = receipt.topicSequenceNumber?.toString() ?? "unknown";

  store.cases.push({
    caseId: verdict.caseId,
    timestamp: verdict.timestamp,
    question: verdict.question,
    topicId: store.topicId,
    sequenceNumber: seqNum,
  });
  store.nextCaseNumber += 1;
  saveCasesStore(store);

  const hashscanBase =
    network === "mainnet" ? "https://hashscan.io/mainnet" : "https://hashscan.io/testnet";

  return {
    topicId: store.topicId,
    sequenceNumber: seqNum,
    hashscanUrl: `${hashscanBase}/topic/${store.topicId}`,
  };
}
