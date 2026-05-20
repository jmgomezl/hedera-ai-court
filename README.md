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

**Try it now:** https://court.aivylabs.xyz

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

![Hedera AI Court Web Demo](demo-web.gif)

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

Submitted for **Hedera AI Agent Bounty Program — Week 1**: "Fun Basic Hedera Agent"

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
