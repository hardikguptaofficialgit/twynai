import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOOTAGE = path.join(ROOT, "capture", "footage");
const API = "http://localhost:8100";
const WEB = "http://localhost:3100";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

await fs.mkdir(FOOTAGE, { recursive: true });

async function api(pathname, options = {}) {
  const response = await fetch(API + pathname, {
    headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw new Error(`${pathname}: ${response.status} ${await response.text()}`);
  return response.json();
}

const stamp = String(Date.now()).slice(-5);
const publicHandle = `mira${stamp}`;
const onboardingHandle = `studio${stamp}`;
const owner = await api("/api/auth/dev", { method: "POST", body: { email: `mira-${stamp}@demo.invalid`, name: "Mira Sen" } });
const onboardingOwner = await api("/api/auth/dev", { method: "POST", body: { email: `creator-${stamp}@demo.invalid`, name: "Aarav Mehta" } });
const persona = await api("/api/personas", {
  method: "POST",
  token: owner.token,
  body: {
    handle: publicHandle,
    name: "Mira Sen",
    headline: "Product designer & design systems lead",
    bio: "I help early-stage teams turn a sharp idea into a clear product, a memorable brand, and a design system that can scale. I work through focused design sprints and practical collaboration.",
    rates: "Brand sprints from 60,000 rupees. Intro calls are free.",
    faqs: [
      { q: "What do you work on?", a: "Product strategy, brand systems, and calm, useful interfaces for early-stage teams." },
      { q: "Do you work with pre-seed founders?", a: "Yes. Most of my work is with pre-seed and seed teams in India." },
    ],
    links: [{ label: "Portfolio", url: "https://example.invalid/portfolio" }],
    tone: "Warm and concise",
    accent: "lilac",
    languages: ["en", "hinglish", "hi", "ta"],
    availability: { days: [0, 1, 2, 3, 4], start: "10:00", end: "18:00", duration: 30, buffer: 15, notice: 2 },
    published: true,
    onboarding_step: 10,
  },
});
await api(`/api/personas/${persona.id}/knowledge`, {
  method: "POST",
  token: owner.token,
  body: { entries: [
    { title: "How I help", text: "Mira helps early-stage founders clarify their product, brand, and design system through focused sprints." },
    { title: "Working style", text: "Warm, direct, practical, and collaborative. Intro calls are free." },
  ] },
});

const manifest = { api: API, web: WEB, publicHandle, onboardingHandle, generatedAt: new Date().toISOString(), scenes: [] };

async function record(name, setup) {
  const context = await chromium.launchPersistentContext("", {
    headless: true,
    executablePath: CHROME,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: FOOTAGE, size: { width: 1440, height: 900 } },
    args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  const video = page.video();
  await context.close();
  const source = await video.path();
  const target = path.join(FOOTAGE, `${name}.webm`);
  await fs.copyFile(source, target);
  manifest.scenes.push({ name, file: `capture/footage/${name}.webm`, errors });
}

await record("01-landing", async (page) => {
  await page.goto(WEB + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.mouse.move(560, 530, { steps: 18 });
  await page.waitForTimeout(500);
  await page.locator("#claim").first().fill(publicHandle, { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Claim" }).first().click();
  await page.waitForTimeout(800);
});

await record("02-onboarding", async (page) => {
  await page.goto(WEB + "/login", { waitUntil: "networkidle" });
  await page.evaluate(({ token, claim }) => { localStorage.setItem("proxy_token", token); localStorage.setItem("proxy_claim", claim); }, { token: onboardingOwner.token, claim: onboardingHandle });
  await page.goto(`${WEB}/onboarding?handle=${onboardingHandle}`, { waitUntil: "networkidle" });
  await page.getByText("Claim your handle").waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  await page.locator("input").first().fill(onboardingHandle);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(700);
  await page.locator("input").first().fill("Aarav Mehta");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(700);
  await page.locator("input").first().fill("Product designer and brand strategist");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(700);
  await page.locator("textarea").fill("I help early-stage teams turn a sharp idea into a clear product and a design system that can scale.");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Hinglish", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Warm and concise/i }).click().catch(() => {});
  await page.waitForTimeout(900);
});

await record("03-public-chat-book", async (page) => {
  await page.goto(WEB + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, claim }) => { localStorage.setItem("proxy_token", token); localStorage.setItem("proxy_claim", claim); }, { token: "", claim: publicHandle });
  await page.goto(`${WEB}/p/${publicHandle}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const input = page.locator("input[placeholder^='Message']");
  await input.fill("What do you work on?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await page.waitForTimeout(900);
});

await record("04-studio", async (page) => {
  await page.goto(WEB + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, claim }) => { localStorage.setItem("proxy_token", token); localStorage.setItem("proxy_claim", claim); }, { token: owner.token, claim: publicHandle });
  await page.goto(`${WEB}/studio`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.mouse.move(1080, 180, { steps: 20 });
  await page.waitForTimeout(600);
});

await record("05-visitor-talk", async (page) => {
  await page.goto(WEB + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.removeItem("proxy_token"); });
  await page.goto(`${WEB}/p/${publicHandle}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Talk", exact: true }).click();
  await page.waitForTimeout(900);
  await page.mouse.move(720, 480, { steps: 18 });
  await page.waitForTimeout(500);
});

await fs.writeFile(path.join(ROOT, "capture", "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ publicHandle, onboardingHandle, scenes: manifest.scenes.map((s) => s.name) }));
