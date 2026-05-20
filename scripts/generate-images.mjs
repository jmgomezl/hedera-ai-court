#!/usr/bin/env node
/**
 * Generate AI judge portraits + hero image using Google Imagen 3
 * Run: GOOGLE_API_KEY=<key> node scripts/generate-images.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) throw new Error("GOOGLE_API_KEY not set");

const OUT_DIR = join(__dirname, "../public/images");
mkdirSync(OUT_DIR, { recursive: true });

const SUBJECTS = [
  {
    name: "vera",
    prompt:
      "Portrait of Judge Vera, a cold precise woman judge, steel blue and white color palette, sharp angular facial features, sleek dark formal judicial attire, minimalist futuristic courtroom background, dramatic cool blue rim lighting, cinematic digital art, dark moody atmosphere, photorealistic, ultra detailed face",
  },
  {
    name: "marco",
    prompt:
      "Portrait of Judge Marco, a warm empathetic male judge, rich emerald green and gold color palette, kind intelligent eyes, wearing classic legal robes with a modern twist, warm wood-paneled courtroom background, soft golden dramatic lighting, cinematic digital art, dark moody atmosphere, photorealistic, ultra detailed face",
  },
  {
    name: "cipher",
    prompt:
      "Portrait of Judge Cipher, a mysterious provocateur judge, deep magenta and shadow color palette, a sharp knowing smirk, sleek dark contemporary attire, abstract dark swirling courtroom background, dramatic magenta back lighting, cinematic digital art, dark moody atmosphere, photorealistic, ultra detailed face",
  },
  {
    name: "hero",
    prompt:
      "Dark dramatic courtroom scene, three empty judge seats glowing with blue, green and magenta neon light, scales of justice hologram floating in the center, Hedera hashgraph network nodes visible in background as subtle glowing lines, cinematic wide angle, deep shadows, futuristic noir atmosphere, digital art, ultra detailed",
  },
];

async function generateImage(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error(`No image in response: ${JSON.stringify(data)}`);
  return b64;
}

for (const subject of SUBJECTS) {
  process.stdout.write(`Generating ${subject.name}... `);
  try {
    const b64 = await generateImage(subject.prompt);
    const outPath = join(OUT_DIR, `${subject.name}.png`);
    writeFileSync(outPath, Buffer.from(b64, "base64"));
    console.log(`saved → public/images/${subject.name}.png`);
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
  }
}

console.log("\nDone! Images saved to public/images/");
