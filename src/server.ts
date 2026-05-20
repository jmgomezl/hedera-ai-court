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

    const url = `${mirrorBase}/api/v1/topics/${store.topicId}/messages?limit=25&order=desc`;
    const mirrorRes = await fetch(url);
    if (!mirrorRes.ok) throw new Error(`Mirror node error: ${mirrorRes.status}`);

    const data = await mirrorRes.json() as { messages: Array<{ message: string; sequence_number: number; consensus_timestamp: string }> };

    const cases = data.messages
      .map((m) => {
        try {
          const json = JSON.parse(Buffer.from(m.message, "base64").toString("utf-8"));
          return {
            caseId: json.case_id,
            timestamp: json.timestamp,
            question: json.question,
            verdict: json.verdict,
            tally: json.vote_tally,
            majorityReasoning: json.majority_reasoning,
            dissent: json.dissent ?? null,
            sequenceNumber: m.sequence_number,
            topicId: store.topicId,
            hashscanUrl: `${network === "mainnet" ? "https://hashscan.io/mainnet" : "https://hashscan.io/testnet"}/topic/${store.topicId}`,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({ cases, topicId: store.topicId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Hedera AI Court server running on http://localhost:${PORT}`);
});
