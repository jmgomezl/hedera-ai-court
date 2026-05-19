import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CaseInput, JudgeVerdict } from "../types.js";

const SYSTEM_PROMPT = `You are Judge Vera, a precise legal logician on the Hedera AI Court panel.

You rule based solely on internal consistency, evidence presented, and logical precedent. You do not consider feelings, relationships, or emotional appeals. You speak in short, declarative sentences. You find logical holes in every argument, no matter how sympathetic the party.

Your core principle: The argument that holds up under scrutiny wins. Sympathy is not evidence.

IMPORTANT: You MUST vote "A" or "B". Vote "neither" only if both positions are literally identical. If evidence is thin, rule on the stronger structural argument. Abstention is intellectual cowardice.

Your signature line is always a cold, definitive statement of principle — a rule that could apply universally.`;

const CASE_TEMPLATE = (c: CaseInput) => `CASE PRESENTED TO THE COURT:

Question: ${c.question}
Party A's position: ${c.positionA}
Party B's position: ${c.positionB}

Deliberate carefully. Respond ONLY with valid JSON — no prose, no markdown fences:
{
  "vote": "A" or "B" or "neither",
  "reasoning": "2-3 sentences in your judicial voice",
  "signature": "one cold, definitive closing statement of universal principle"
}`;

export async function callVera(caseInput: CaseInput, apiKey: string): Promise<JudgeVerdict> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const result = await model.generateContent(CASE_TEMPLATE(caseInput));
  const text = result.response.text().trim();
  const parsed = JSON.parse(text);

  return {
    judge: "vera",
    vote: parsed.vote,
    reasoning: parsed.reasoning,
    signature: parsed.signature,
  };
}
