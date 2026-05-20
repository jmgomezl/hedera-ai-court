import { GoogleGenerativeAI } from "@google/generative-ai";
import { callVera } from "./judges/vera.js";
import { callMarco } from "./judges/marco.js";
import { callCipher } from "./judges/cipher.js";
import type { CaseInput, CourtVerdict, JudgeVerdict, Vote } from "./types.js";

const EXTRACT_SYSTEM = `You are a court clerk preparing cases for a panel of judges. Your job is to extract the core question and construct the STRONGEST POSSIBLE argument for each side — regardless of how the dispute was submitted.

Rules:
- The submitter naturally favours their own side. You must compensate by steelmanning BOTH positions equally.
- positionA and positionB must each be a fully articulated argument with the best reasoning, values, or principles that support that side — not just a statement of preference.
- If the opposing side's reasoning was not stated, infer the most compelling case they could make.
- Neither position should read as weaker than the other on paper.
- Respond ONLY with valid JSON, no markdown fences.`;

const EXTRACT_TEMPLATE = (dispute: string) => `DISPUTE SUBMITTED:
"${dispute}"

Extract and respond with:
{
  "question": "the core yes/no or A-vs-B question, framed neutrally as a third party would frame it",
  "positionA": "the strongest possible argument for the first party — steelmanned with reasoning and principles, not just their stated preference",
  "positionB": "the strongest possible argument for the opposing side — steelmanned with reasoning and principles, even if the submitter did not articulate it"
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
  // Randomly swap A/B so judges never systematically favour the submitter's framing.
  // We flip back after deliberation so the final verdict always refers to the
  // original positions the user submitted.
  const swapped = Math.random() < 0.5;
  const judgeInput: CaseInput = swapped
    ? { ...caseInput, positionA: caseInput.positionB, positionB: caseInput.positionA }
    : caseInput;

  const [vera, marco, cipher] = await Promise.all([
    callVera(judgeInput, apiKey),
    callMarco(judgeInput, apiKey),
    callCipher(judgeInput, apiKey),
  ]);

  // If we swapped, flip votes back to original orientation
  const flipVote = (v: Vote): Vote => (v === "A" ? "B" : v === "B" ? "A" : v);
  const unswap = (j: JudgeVerdict): JudgeVerdict =>
    swapped ? { ...j, vote: flipVote(j.vote) } : j;

  const [veraFinal, marcoFinal, cipherFinal] = [unswap(vera), unswap(marco), unswap(cipher)];

  const { verdict, tally, majorityReasoning, dissent } = tallyVotes([veraFinal, marcoFinal, cipherFinal]);

  return {
    caseId,
    timestamp: new Date().toISOString(),
    question: caseInput.question,
    positionA: caseInput.positionA,
    positionB: caseInput.positionB,
    judges: { vera: veraFinal, marco: marcoFinal, cipher: cipherFinal },
    tally,
    verdict,
    majorityReasoning,
    dissent,
  };
}
