import { chromium } from "playwright";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";

const SITE = "http://localhost:19300";
const OUT = "/tmp/court-frames";
const DISPUTE = "Was pineapple on pizza a good idea? Settle this forever.";

mkdirSync(OUT, { recursive: true });

let frame = 0;
const shot = async (page, label) => {
  const n = String(frame++).padStart(3, "0");
  await page.screenshot({ path: `${OUT}/frame-${n}-${label}.png`, fullPage: false });
  console.log(`  📸 frame-${n}-${label}.png`);
};

// duplicate a frame N times (adds pause time at that state)
const hold = async (page, label, times = 3) => {
  for (let i = 0; i < times; i++) await shot(page, label);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 900, height: 700 });

console.log("→ Loading homepage...");
await page.goto(SITE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await hold(page, "homepage", 5);   // hold on hero + judges strip

console.log("→ Typing dispute...");
// Scroll to textarea
await page.evaluate(() => window.scrollTo({ top: 200, behavior: "instant" }));
await shot(page, "scrolled");

const ta = page.locator("#dispute-input");
await ta.click();
// Type character by character for typewriter effect
for (const char of DISPUTE) {
  await ta.type(char, { delay: 30 });
  if (Math.random() < 0.15) await shot(page, "typing");
}
await shot(page, "typed");
await hold(page, "typed", 2);

console.log("→ Submitting...");
await page.click("#submit-btn");
await shot(page, "submitted");
await page.waitForTimeout(600);
await shot(page, "loading");
await hold(page, "loading", 3);

console.log("→ Waiting for verdict (up to 40s)...");
try {
  await page.waitForSelector("#case-header", { state: "visible", timeout: 40000 });
} catch {
  console.error("Verdict timed out");
  await browser.close();
  process.exit(1);
}

await shot(page, "case-header");
await hold(page, "case-header", 2);

// Wait for judge cards to appear
await page.waitForSelector(".judge-card.visible", { timeout: 5000 }).catch(() => {});
await shot(page, "judges-appearing");
await page.waitForTimeout(400);
await shot(page, "judges-1");
await page.waitForTimeout(400);
await shot(page, "judges-2");
await page.waitForTimeout(400);
await shot(page, "judges-all");
await hold(page, "judges-all", 3);

// Scroll to verdict
await page.waitForSelector("#verdict-section", { state: "visible", timeout: 5000 }).catch(() => {});
await page.evaluate(() => {
  const el = document.getElementById("verdict-section");
  if (el) el.scrollIntoView({ behavior: "instant" });
});
await page.waitForTimeout(300);
await shot(page, "verdict");
await hold(page, "verdict", 5);

// Scroll to seal section
await page.evaluate(() => {
  const el = document.getElementById("seal-section");
  if (el) el.scrollIntoView({ behavior: "instant" });
});
await page.waitForTimeout(200);
await shot(page, "seal-prompt");
await hold(page, "seal-prompt", 4);

await browser.close();
console.log(`\n✅ ${frame} frames saved to ${OUT}`);
console.log("→ Building GIF with ffmpeg...");

execSync(
  `ffmpeg -y -framerate 4 -pattern_type glob -i '${OUT}/frame-*.png' \
   -vf "scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
   /tmp/demo-web.gif`,
  { stdio: "inherit" }
);

console.log("\n🎉 GIF saved → /tmp/demo-web.gif");
