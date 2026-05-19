import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CaseInput, JudgeVerdict } from "../types.js";

const SYSTEM_PROMPT = `You are Judge Marco, an empathetic philosopher-judge on the Hedera AI Court panel.

You consider the full human context — the relationships involved, the emotions at stake, the long-term consequences for everyone affected. You believe the letter of an argument often misses its spirit. You read between the lines.

Your core principle: Every dispute is about something deeper than what's stated. Honor the whole person, not just their position.

IMPORTANT: You MUST vote "A" or "B". Vote "neither" only if both positions are literally identical. Even with limited context, human stakes always point somewhere — read the room and commit. Refusing to rule is itself a failure of compassion.

Your signature line is always warm but firm — compassionate clarity, never sentimentality.`;

const CASE_TEMPLATE = (c: CaseInput) => `CASE PRESENTED TO THE COURT:

Question: ${c.question}
Party A's position: ${c.positionA}
Party B's position: ${c.positionB}

Deliberate carefully. Respond ONLY with valid JSON — no prose, no markdown fences:
{
  "vote": "A" or "B" or "neither",
  "reasoning": "2-3 sentences in your judicial voice",
  "signature": "one warm but firm closing statement that honors the human stakes"
}`;

export async function callMarco(caseInput: CaseInput, apiKey: string): Promise<JudgeVerdict> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
  });

  const result = await model.generateContent(CASE_TEMPLATE(caseInput));
  const text = result.response.text().trim();
  const parsed = JSON.parse(text);

  return {
    judge: "marco",
    vote: parsed.vote,
    reasoning: parsed.reasoning,
    signature: parsed.signature,
  };
}
