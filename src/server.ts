import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { extractCaseInput, orchestrateCourt } from "./court.js";
import { sealVerdict, loadCasesStore, nextCaseId, saveCasesStore } from "./hcs.js";
import { createCourtAgent } from "./agent.js";
import type { CourtVerdict } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve public dir relative to project root (works both in src/ and dist/esm/)
const publicDir = join(__dirname, "../../public");

const app = express();

// Trust nginx reverse-proxy so req.ip is the real client IP
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.static(publicDir));

// Rate limiter for /api/judge — 10 verdicts per IP per hour (each call uses 4 Gemini requests)
const judgeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verdicts requested from this IP. Please wait before trying again." },
});

// Rate limiter for /api/seal — 5 seals per IP per hour (each call costs HBAR)
const sealLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many seal requests from this IP. Please wait before trying again." },
});

const PORT = process.env.PORT ?? 3000;

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

const googleApiKey = getEnv("GOOGLE_API_KEY");
const network = process.env.HEDERA_NETWORK ?? "testnet";
const { client } = createCourtAgent(
  getEnv("HEDERA_ACCOUNT_ID"),
  getEnv("HEDERA_PRIVATE_KEY"),
  network,
  googleApiKey
);

// POST /api/judge — run all three judges
app.post("/api/judge", judgeLimiter, async (req, res) => {
  try {
    const { dispute } = req.body as { dispute: string };
    if (!dispute?.trim()) {
      res.status(400).json({ error: "Dispute text is required" });
      return;
    }

    const store = loadCasesStore();
    const caseId = nextCaseId(store);

    const caseInput = await extractCaseInput(dispute, googleApiKey);
    const verdict = await orchestrateCourt(caseInput, caseId, googleApiKey);

    res.json({ verdict });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /api/seal — seal verdict on HCS
app.post("/api/seal", sealLimiter, async (req, res) => {
  try {
    const { verdict } = req.body as { verdict: CourtVerdict };
    if (!verdict) {
      res.status(400).json({ error: "Verdict is required" });
      return;
    }

    const sealResult = await sealVerdict(client, verdict, network);

    // Increment case number
    const store = loadCasesStore();
    store.nextCaseNumber += 1;
    saveCasesStore(store);

    res.json({ sealResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// GET /api/history — fetch sealed verdicts from Hedera Mirror Node
app.get("/api/history", async (_req, res) => {
  try {
    const store = loadCasesStore();
    if (!store.topicId) {
      res.json({ cases: [] });
      return;
    }

    const network = process.env.HEDERA_NETWORK ?? "testnet";
    const mirrorBase =
      network === "mainnet"
        ? "https://mainnet.mirrornode.hedera.com"
        : "https://testnet.mirrornode.hedera.com";
    const hashscanBase =
      network === "mainnet" ? "https://hashscan.io/mainnet" : "https://hashscan.io/testnet";

    // Fetch enough messages to cover chunked verdicts (each verdict ~4 chunks)
    const url = `${mirrorBase}/api/v1/topics/${store.topicId}/messages?limit=100&order=asc`;
    const mirrorRes = await fetch(url);
    if (!mirrorRes.ok) throw new Error(`Mirror node error: ${mirrorRes.status}`);

    type MirrorMsg = {
      message: string;
      sequence_number: number;
      consensus_timestamp: string;
      chunk_info?: {
        initial_transaction_id: { account_id: string; transaction_valid_start: string };
        number: number;
        total: number;
      };
    };
    const data = await mirrorRes.json() as { messages: MirrorMsg[] };

    // Group chunks by their initial_transaction_id key
    const groups = new Map<string, MirrorMsg[]>();
    for (const m of data.messages) {
      const key = m.chunk_info
        ? `${m.chunk_info.initial_transaction_id.account_id}-${m.chunk_info.initial_transaction_id.transaction_valid_start}`
        : `solo-${m.sequence_number}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    const cases: object[] = [];
    for (const chunks of groups.values()) {
      try {
        // Sort by chunk number, then reassemble
        chunks.sort((a, b) => (a.chunk_info?.number ?? 1) - (b.chunk_info?.number ?? 1));
        const combined = Buffer.concat(chunks.map(c => Buffer.from(c.message, "base64")));
        const json = JSON.parse(combined.toString("utf-8"));

        // Only include complete, valid verdicts
        if (!json.case_id || !json.question) continue;

        cases.push({
          caseId: json.case_id,
          timestamp: json.timestamp,
          question: json.question,
          verdict: json.verdict,
          tally: json.vote_tally,
          majorityReasoning: json.majority_reasoning,
          dissent: json.dissent ?? null,
          sequenceNumber: chunks[0].sequence_number,
          topicId: store.topicId,
          hashscanUrl: `${hashscanBase}/topic/${store.topicId}`,
        });
      } catch {
        // Skip malformed/incomplete groups
      }
    }

    // Return most recent first
    cases.reverse();
    res.json({ cases, topicId: store.topicId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Hedera AI Court server running on http://localhost:${PORT}`);
});
