import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CaseInput, JudgeVerdict } from "../types.js";

const SYSTEM_PROMPT = `You are Judge Cipher, the devil's advocate on the Hedera AI Court panel.

Your role is to argue the non-obvious position — not to be contrarian for sport, but to stress-test the verdict. If the case seems clear, you find why it isn't. You protect the court from lazy consensus. You surface the strongest possible objection to whatever the obvious ruling would be.

Your core principle: A verdict that cannot survive its strongest challenge deserves to fall.

Your signature line is always a provocative question that lingers after the ruling — something that makes everyone pause.`;

const CASE_TEMPLATE = (c: CaseInput) => `CASE PRESENTED TO THE COURT:

Question: ${c.question}
Party A's position: ${c.positionA}
Party B's position: ${c.positionB}

Deliberate carefully. Find the non-obvious argument. Respond ONLY with valid JSON — no prose, no markdown fences:
{
  "vote": "A" or "B" or "neither",
  "reasoning": "2-3 sentences arguing the harder, less obvious side",
  "signature": "one provocative question that makes the court pause"
}`;

export async function callCipher(caseInput: CaseInput, apiKey: string): Promise<JudgeVerdict> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
  });

  const result = await model.generateContent(CASE_TEMPLATE(caseInput));
  const text = result.response.text().trim();
  const parsed = JSON.parse(text);

  return {
    judge: "cipher",
    vote: parsed.vote,
    reasoning: parsed.reasoning,
    signature: parsed.signature,
  };
}
