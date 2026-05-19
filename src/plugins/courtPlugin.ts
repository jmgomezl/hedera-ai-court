import { BaseTool } from "@hashgraph/hedera-agent-kit";
import type { Context } from "@hashgraph/hedera-agent-kit";
import { Client } from "@hiero-ledger/sdk";
import { z } from "zod";
import { extractCaseInput, orchestrateCourt } from "../court.js";
import { sealVerdict, loadCasesStore, nextCaseId } from "../hcs.js";
import type { CourtVerdict } from "../types.js";

// ─── judge_dispute_tool ───────────────────────────────────────────────────────

class JudgeDisputeTool extends BaseTool<
  { dispute: string; position_a?: string; position_b?: string },
  { dispute: string; positionA: string; positionB: string; caseId: string }
> {
  method = "judge_dispute_tool";
  name = "judge_dispute_tool";
  description =
    "Bring a dispute before the Hedera AI Court's three judges (Vera, Marco, Cipher) and receive a majority verdict.";

  parameters = z.object({
    dispute: z.string().describe("The dispute, question, or conflict to be judged"),
    position_a: z.string().optional().describe("Optional explicit position of Party A"),
    position_b: z.string().optional().describe("Optional explicit position of Party B"),
  });

  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async normalizeParams(
    params: { dispute: string; position_a?: string; position_b?: string },
    _context: Context,
    _client: Client
  ) {
    const store = loadCasesStore();
    const caseId = nextCaseId(store);

    if (params.position_a && params.position_b) {
      return {
        dispute: params.dispute,
        positionA: params.position_a,
        positionB: params.position_b,
        caseId,
      };
    }

    const extracted = await extractCaseInput(params.dispute, this.apiKey);
    return {
      dispute: params.dispute,
      positionA: params.position_a ?? extracted.positionA,
      positionB: params.position_b ?? extracted.positionB,
      caseId,
    };
  }

  async coreAction(
    params: { dispute: string; positionA: string; positionB: string; caseId: string },
    _context: Context,
    _client: Client
  ): Promise<CourtVerdict> {
    const verdict = await orchestrateCourt(
      { question: params.dispute, positionA: params.positionA, positionB: params.positionB },
      params.caseId,
      this.apiKey
    );
    return verdict;
  }

  async shouldSecondaryAction(_result: CourtVerdict, _context: Context): Promise<boolean> {
    return false;
  }

  async secondaryAction(result: CourtVerdict, _client: Client, _context: Context): Promise<CourtVerdict> {
    return result;
  }
}

// ─── seal_case_tool ───────────────────────────────────────────────────────────

class SealCaseTool extends BaseTool<
  { verdict_json: string },
  { verdict: CourtVerdict; network: string }
> {
  method = "seal_case_tool";
  name = "seal_case_tool";
  description =
    "Seal a Hedera AI Court verdict permanently on Hedera Consensus Service (HCS). Returns a hashscan.io explorer link.";

  parameters = z.object({
    verdict_json: z.string().describe("JSON-serialized CourtVerdict to seal on HCS"),
  });

  private network: string;

  constructor(network: string) {
    super();
    this.network = network;
  }

  async normalizeParams(params: { verdict_json: string }, _context: Context, _client: Client) {
    return {
      verdict: JSON.parse(params.verdict_json) as CourtVerdict,
      network: this.network,
    };
  }

  async coreAction(
    params: { verdict: CourtVerdict; network: string },
    _context: Context,
    client: Client
  ) {
    return await sealVerdict(client, params.verdict, params.network);
  }

  async shouldSecondaryAction(_result: unknown, _context: Context): Promise<boolean> {
    return false;
  }

  async secondaryAction(result: unknown, _client: Client, _context: Context): Promise<unknown> {
    return result;
  }
}

// ─── Plugin (plain object — HAK v4 pattern) ───────────────────────────────────

export const courtPlugin = (apiKey: string, network: string) => ({
  name: "hedera-ai-court",
  version: "1.0.0",
  description: "AI-powered dispute resolution sealed on Hedera Consensus Service",
  tools: (_ctx: Context) => [new JudgeDisputeTool(apiKey), new SealCaseTool(network)],
});
