# ⚖️ Hedera AI Court

> *Every dispute deserves a verdict. Every verdict deserves to last forever.*

A panel of three AI judges with distinct personalities deliberate over any dispute you bring to them. Majority rules. The full verdict is sealed permanently on **Hedera Consensus Service (HCS)** — immutable, tamper-proof, and publicly verifiable.

---

## The Judges

### ⚖️ Judge Vera — The Logician
Cold. Precise. Evidence-driven. Vera rules based solely on internal consistency and logical precedent. She finds holes in every argument. Feelings are not evidence.

### 🕊️ Judge Marco — The Humanist  
Reads between the lines. Considers relationships, emotional reality, and long-term consequences. Believes the letter of an argument often misses its spirit.

### 😈 Judge Cipher — The Devil's Advocate
Whatever the obvious answer is, Cipher argues the harder side — not to be contrarian, but to ensure the verdict survives its toughest challenge. Every consensus is innocent until proven robust.

---

## Live Demo

**Try it now:** http://167.172.152.172

![Hedera AI Court Demo](demo.gif)

---

## Example Cases

```
"My co-founder wants to pivot 6 months before launch. I think it's a mistake. Who's right?"

"Was pineapple on pizza a good idea? Settle this forever."

"I worked overtime for 3 weeks straight. My boss says that's just 'commitment'. Is he wrong?"
```

---

## How It Works

1. **You describe your dispute** in plain English
2. **The court clerk** (Gemini) extracts the core question and both positions
3. **Three parallel Gemini calls** — each judge deliberates with their unique voice
4. **Majority verdict** is rendered with full reasoning and any dissenting opinion
5. **You decide** whether to seal it on Hedera for ~0.5 HBAR
6. **On-chain forever** — you receive a hashscan.io explorer link as your blockchain receipt

---

## Technical Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20+, TypeScript, ESM |
| AI Reasoning | Google Gemini 2.5 Flash (via AI Studio) |
| Blockchain | Hedera Consensus Service (HCS) |
| Agent Framework | [@hashgraph/hedera-agent-kit](https://www.npmjs.com/package/@hashgraph/hedera-agent-kit) v4 |
| SDK | [@hiero-ledger/sdk](https://www.npmjs.com/package/@hiero-ledger/sdk) v2 |
| Build | tsup, strict TypeScript |

---

## Setup

### Prerequisites
- Node.js 20+
- A [Hedera testnet account](https://portal.hedera.com) (free)
- A [Google AI Studio API key](https://aistudio.google.com) (free tier works)

### Installation

```bash
git clone https://github.com/jmgomezl/hedera-ai-court
cd hedera-ai-court
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
HEDERA_ACCOUNT_ID=0.0.XXXXXX
HEDERA_PRIVATE_KEY=302e...
GOOGLE_API_KEY=AIza...
HEDERA_NETWORK=testnet
```

### Run

```bash
npm run dev
```

---

## Demo

```
═══════════════════════════════════════════════════════════
  ⚖️  HEDERA AI COURT
  Every dispute deserves a verdict.
  Every verdict deserves to last forever.
═══════════════════════════════════════════════════════════

  ⚖️  Your dispute > My co-founder wants to pivot 6 months before launch.

  The judges are deliberating...

═══════════════════════════════════════════════════════════
  ⚖️  HEDERA AI COURT — CASE HAC-0001
═══════════════════════════════════════════════════════════

  Question: Should the startup pivot 6 months before their planned launch?
  Party A: The co-founder who opposes the pivot
  Party B: The co-founder who wants to pivot

  ────────────────────────────────────────────────────────
  JUDICIAL PANEL DELIBERATIONS
  ────────────────────────────────────────────────────────

  ⚖️   Judge Vera — The Logician
  Ruling: PARTY A
  Reasoning: Six months from launch represents committed resources, validated
  assumptions, and stakeholder expectations. Pivoting without evidence of
  fundamental product-market failure violates the principle of sunk cost
  asymmetry — the cost of proceeding is known, the cost of pivoting is not.
  "A late-stage pivot is an admission that validation was skipped, not a sign
  of agility."

  🕊️   Judge Marco — The Humanist
  Ruling: PARTY A
  Reasoning: The relationship between co-founders is the company's most
  fragile asset. A unilateral pivot demand at this stage signals either a
  breakdown in shared vision or a fundamental anxiety that deserves a
  conversation, not a strategy change. Address the fear, not the product.
  "What your co-founder is really asking for is to be heard."

  😈 Judge Cipher — The Devil's Advocate
  Ruling: PARTY B
  Reasoning: Launching a product you no longer believe in is worse than
  missing a deadline. If the co-founder's conviction has genuinely collapsed,
  shipping anyway is self-deception at scale.
  "What would you rather explain to your investors: a delayed launch, or a
  failed one?"

  ═══════════════════════════════════════════════════════════
  ⚖️  FINAL VERDICT  (2-1)

    ▶  PARTY A  ◀

  Majority reasoning: [Vera + Marco's combined reasoning]
  Dissenting opinion: [Cipher's dissent]
  ═══════════════════════════════════════════════════════════

  Seal this verdict permanently on Hedera? (~0.5 HBAR) (yes/no) > yes

  Submitting to Hedera Consensus Service...

  ✅  Verdict sealed on Hedera Consensus Service
  Case:     HAC-0001
  Topic ID: 0.0.9007586
  Sequence: #1
  Explorer: https://hashscan.io/testnet/topic/0.0.9007586
```

---

## HCS Message Format

Every sealed verdict stores this JSON on-chain:

```json
{
  "court": "Hedera AI Court",
  "case_id": "HAC-0001",
  "timestamp": "2026-05-19T20:00:00.000Z",
  "question": "Should the startup pivot 6 months before their planned launch?",
  "verdict": "Party A",
  "vote_tally": "2-1",
  "judges": {
    "vera": { "vote": "A", "reasoning": "...", "signature": "..." },
    "marco": { "vote": "A", "reasoning": "...", "signature": "..." },
    "cipher": { "vote": "B", "reasoning": "...", "signature": "..." }
  },
  "majority_reasoning": "...",
  "dissent": "..."
}
```

---

## Project Structure

```
hedera-ai-court/
├── src/
│   ├── index.ts              # Entry point, conversational loop
│   ├── agent.ts              # HAK v4 HederaAgentAPI setup
│   ├── court.ts              # Dispute extraction + judge orchestration
│   ├── judges/
│   │   ├── vera.ts           # Logician — Gemini call + system prompt
│   │   ├── marco.ts          # Humanist — Gemini call + system prompt
│   │   └── cipher.ts         # Devil's Advocate — Gemini call + system prompt
│   ├── plugins/
│   │   └── courtPlugin.ts    # HAK v4 plugin (plain object + BaseTool classes)
│   ├── hcs.ts                # Topic creation + message submission
│   ├── formatter.ts          # Terminal output with chalk
│   └── types.ts              # Shared TypeScript types
├── .env.example
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Bounty Submission

Submitted for **Hedera AI Agent Bounty Program — Week 1**: "Fun Basic Hedera Agent" ($500)

**Checklist:**
- ✅ Public GitHub repo
- ✅ Uses Hedera Agent Kit (HAK v4, plain-object plugin + BaseTool classes)
- ✅ Real on-chain transaction (HCS message submit, pays HBAR fee)
- ✅ Human-in-the-loop confirmation before any on-chain action
- ✅ Google AI Studio (Gemini) as the AI reasoning engine
- ✅ Live demo (see above)

---

## Author

**Juan Manuel Gómez** ([@jmgomezl](https://github.com/jmgomezl))  
Hedera Ambassador | Published HAK plugins: [hak-saucerswap-plugin](https://www.npmjs.com/package/hak-saucerswap-plugin), [hak-pyth-plugin](https://www.npmjs.com/package/hak-pyth-plugin), [hak-stader-plugin](https://www.npmjs.com/package/hak-stader-plugin), [hak-layerzero-plugin](https://www.npmjs.com/package/hak-layerzero-plugin)

---

## License

MIT
