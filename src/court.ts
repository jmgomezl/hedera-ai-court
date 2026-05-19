import { GoogleGenerativeAI } from "@google/generative-ai";
import { callVera } from "./judges/vera.js";
import { callMarco } from "./judges/marco.js";
import { callCipher } from "./judges/cipher.js";
import type { CaseInput, CourtVerdict, JudgeVerdict, Vote } from "./types.js";

const EXTRACT_SYSTEM = `You are a court clerk. Your job is to parse a dispute submission and extract three fields as JSON.
Always infer positions if not explicitly stated. Be charitable and specific.
Respond ONLY with valid JSON, no markdown fences.`;

const EXTRACT_TEMPLATE = (dispute: string) => `DISPUTE SUBMITTED:
"${dispute}"

Extract and respond with:
{
  "question": "the core yes/no or A-vs-B question being settled",
  "positionA": "what the first party / person asking wants or believes",
  "positionB": "what the opposing party / position argues"
}`;

export async function extractCaseInput(dispute: string, apiKey: string): Promise<CaseInput> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: EXTRACT_SYSTEM,
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  });

  const result = await model.generateContent(EXTRACT_TEMPLATE(dispute));
  const parsed = JSON.parse(result.response.text().trim());

  return {
    question: parsed.question,
    positionA: parsed.positionA,
    positionB: parsed.positionB,
  };
}

function tallyVotes(verdicts: JudgeVerdict[]): {
  verdict: "Party A" | "Party B" | "Deadlocked";
  tally: string;
  majorityReasoning: string;
  dissent?: string;
} {
  const votesA = verdicts.filter((v) => v.vote === "A");
  const votesB = verdicts.filter((v) => v.vote === "B");
  const votesNeither = verdicts.filter((v) => v.vote === "neither");

  if (votesA.length >= 2) {
    const majority = votesA.map((v) => v.reasoning).join(" ");
    const dissentJudge = verdicts.find((v) => v.vote !== "A");
    return {
      verdict: "Party A",
      tally: `${votesA.length}-${votesB.length + votesNeither.length}`,
      majorityReasoning: majority,
      dissent: dissentJudge?.reasoning,
    };
  }

  if (votesB.length >= 2) {
    const majority = votesB.map((v) => v.reasoning).join(" ");
    const dissentJudge = verdicts.find((v) => v.vote !== "B");
    return {
      verdict: "Party B",
      tally: `${votesB.length}-${votesA.length + votesNeither.length}`,
      majorityReasoning: majority,
      dissent: dissentJudge?.reasoning,
    };
  }

  return {
    verdict: "Deadlocked",
    tally: `${votesA.length}-${votesB.length}-${votesNeither.length}`,
    majorityReasoning: "The court could not reach a majority. The matter remains unresolved.",
  };
}

export async function orchestrateCourt(
  caseInput: CaseInput,
  caseId: string,
  apiKey: string
): Promise<CourtVerdict> {
  const [vera, marco, cipher] = await Promise.all([
    callVera(caseInput, apiKey),
    callMarco(caseInput, apiKey),
    callCipher(caseInput, apiKey),
  ]);

  const { verdict, tally, majorityReasoning, dissent } = tallyVotes([vera, marco, cipher]);

  return {
    caseId,
    timestamp: new Date().toISOString(),
    question: caseInput.question,
    positionA: caseInput.positionA,
    positionB: caseInput.positionB,
    judges: { vera, marco, cipher },
    tally,
    verdict,
    majorityReasoning,
    dissent,
  };
}
