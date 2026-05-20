import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { extractCaseInput, orchestrateCourt } from "./court.js";
import { sealVerdict, loadCasesStore, nextCaseId, saveCasesStore } from "./hcs.js";
import { createCourtAgent } from "./agent.js";
import type { CourtVerdict } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "../public")));

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
app.post("/api/judge", async (req, res) => {
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
app.post("/api/seal", async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Hedera AI Court server running on http://localhost:${PORT}`);
});
