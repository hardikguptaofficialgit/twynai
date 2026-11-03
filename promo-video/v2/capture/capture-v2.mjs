import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOOTAGE = path.join(ROOT, "public", "v2", "footage");
const STILLS = path.join(ROOT, "capture", "stills");
const API = process.env.TWYN_V2_API ?? "http://localhost:8101";
const WEB = process.env.TWYN_V2_WEB ?? "http://localhost:3101";
const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

await fs.mkdir(FOOTAGE, { recursive: true });
await fs.mkdir(STILLS, { recursive: true });

async function api(pathname, options = {}) {
  const response = await fetch(API + pathname, {
    headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw new Error(`${pathname}: ${response.status}`);
  return response.json();
}

const health = await fetch(`${API}/api/health/db`);
if (!health.ok) throw new Error(`V2 capture API unavailable: ${health.status}`);

const stamp = String(Date.now()).slice(-6);
const publicHandle = `mira-v2-${stamp}`;
const setupHandle = `arav-v2-${stamp}`;
const owner = await api("/api/auth/dev", { method: "POST", body: { email: `mira-v2-${stamp}@demo.invalid`, name: "Mira Sen" } });
const setupOwner = await api("/api/auth/dev", { method: "POST", body: { email: `arav-v2-${stamp}@demo.invalid`, name: "Aarav Mehta" } });

const publicPersona = await api("/api/personas", { method: "POST", token: owner.token, body: {
  handle: publicHandle, name: "Mira Sen", headline: "Product designer & design systems lead",
  bio: "I help early-stage teams turn sharp ideas into clear products, distinctive brands, and design systems that can scale.",
  rates: "Brand sprints from 60,000 rupees. Intro calls are free.", tone: "Warm and concise", accent: "lilac",
  languages: ["en", "hinglish", "hi", "ta"], published: true, onboarding_step: 10,
  faqs: [{ q: "What do you work on?", a: "Product strategy, brand systems, and calm, useful interfaces for early-stage teams." }],
  links: [{ label: "Portfolio", url: "https://example.invalid/portfolio" }],
  availability: { days: [0, 1, 2, 3, 4], start: "10:00", end: "18:00", duration: 30, buffer: 15, notice: 2 },
} });
await api(`/api/personas/${publicPersona.id}/knowledge`, { method: "POST", token: owner.token, body: { entries: [
  { title: "How I help", text: "Mira helps early-stage founders clarify product, brand and design systems through focused design sprints." },
  { title: "Working style", text: "Warm, direct, practical and collaborative. Intro calls are free." },
] } });

const setupPersona = await api("/api/personas", { method: "POST", token: setupOwner.token, body: {
  handle: setupHandle, name: "Aarav Mehta", headline: "Product designer", bio: "I help teams make clear products.",
  tone: "Warm and concise", accent: "lilac", languages: ["en", "hinglish"], published: false, onboarding_step: 6,
  faqs: [{ q: "How can you help?", a: "I make product systems understandable." }], links: [], rates: "",
  availability: { days: [1,2,3,4,5], start: "10:00", end: "18:00", duration: 30, buffer: 15, notice: 2 },
} });

const manifest = { generatedAt: new Date().toISOString(), api: "local isolated SQLite", web: WEB, publicHandle, setupHandle, scenes: [] };

async function record(name, work) {
  const context = await chromium.launchPersistentContext("", { headless: true, executablePath: CHROME, viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1, recordVideo: { dir: FOOTAGE, size: { width: 1920, height: 1200 } }, args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await work(page);
  await page.screenshot({ path: path.join(STILLS, `${name}.png`) });
  const video = page.video();
  await context.close();
  const source = await video.path();
  await fs.copyFile(source, path.join(FOOTAGE, `${name}.webm`));
  manifest.scenes.push({ name, errors });
}

async function putToken(page, token, claim) {
  await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token: t, claim: c }) => { localStorage.setItem("proxy_token", t); localStorage.setItem("proxy_claim", c); }, { token, claim });
}

await record("v2-01-landing", async (page) => {
  await page.goto(`${WEB}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(850);
  await page.mouse.move(700, 680, { steps: 22 }); await page.waitForTimeout(260);
  await page.locator("#claim").first().fill(setupHandle); await page.waitForTimeout(380);
  await page.getByRole("button", { name: "Claim" }).first().click(); await page.waitForTimeout(900);
});

await record("v2-02-onboarding", async (page) => {
  await putToken(page, setupOwner.token, setupHandle);
  await page.goto(`${WEB}/onboarding?handle=${setupHandle}`, { waitUntil: "networkidle" });
  await page.getByText("What should it know?").waitFor({ timeout: 10000 });
  // Move back to a real, visible creation step then perform the central decisions.
  await page.getByRole("button", { name: "Style" }).click(); await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Friendly and casual", exact: true }).click(); await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Knowledge" }).click(); await page.waitForTimeout(900);
  await page.mouse.move(1040, 650, { steps: 18 }); await page.waitForTimeout(350);
});

await record("v2-03-voice-knowledge", async (page) => {
  await putToken(page, setupOwner.token, setupHandle);
  await page.goto(`${WEB}/onboarding?handle=${setupHandle}`, { waitUntil: "networkidle" });
  await page.getByText("What should it know?").waitFor({ timeout: 10000 }); await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(1000);
  await page.getByText("Teach it your voice").waitFor({ timeout: 10000 });
  await page.mouse.move(1010, 745, { steps: 18 }); await page.waitForTimeout(750);
});

await record("v2-04-public-chat", async (page) => {
  await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.removeItem("proxy_token"); });
  await page.goto(`${WEB}/p/${publicHandle}`, { waitUntil: "networkidle" }); await page.waitForTimeout(850);
  const input = page.locator("input[placeholder^='Message']");
  await input.fill("What do you work on?"); await page.waitForTimeout(520);
  await page.getByRole("button", { name: "Send" }).click(); await page.waitForTimeout(2600);
  await page.getByRole("button", { name: "Book", exact: true }).click(); await page.waitForTimeout(900);
});

await record("v2-05-talk", async (page) => {
  await page.goto(`${WEB}/p/${publicHandle}`, { waitUntil: "networkidle" }); await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Talk", exact: true }).click(); await page.waitForTimeout(900);
  await page.mouse.move(965, 650, { steps: 20 }); await page.waitForTimeout(450);
});

await fs.writeFile(path.join(ROOT, "capture", "manifest-v2.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ publicHandle, setupHandle, scenes: manifest.scenes }));
