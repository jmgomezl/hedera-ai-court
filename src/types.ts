export type Vote = "A" | "B" | "neither";

export type JudgeName = "vera" | "marco" | "cipher";

export type JudgeVerdict = {
  judge: JudgeName;
  vote: Vote;
  reasoning: string;
  signature: string;
};

export type CaseInput = {
  question: string;
  positionA: string;
  positionB: string;
};

export type CourtVerdict = {
  caseId: string;
  timestamp: string;
  question: string;
  positionA: string;
  positionB: string;
  judges: {
    vera: JudgeVerdict;
    marco: JudgeVerdict;
    cipher: JudgeVerdict;
  };
  tally: string;
  verdict: "Party A" | "Party B" | "Deadlocked";
  majorityReasoning: string;
  dissent?: string;
};

export type SealResult = {
  topicId: string;
  sequenceNumber: string;
  hashscanUrl: string;
};

export type CasesStore = {
  topicId: string | null;
  nextCaseNumber: number;
  cases: Array<{
    caseId: string;
    timestamp: string;
    question: string;
    topicId?: string;
    sequenceNumber?: string;
  }>;
};
