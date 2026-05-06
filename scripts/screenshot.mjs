#!/usr/bin/env node
/**
 * Visual regression / documentation script.
 * Loads the production deployment in a headless Chrome and captures
 * each tab + the print views + the share page at desktop and mobile widths.
 *
 *   BASE=https://ph-scheduling-app.vercel.app npm run screenshots
 *
 * Outputs to ./screenshots/.
 */

import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = path.resolve("screenshots");

const PROFILES = [
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 2 },
  { name: "mobile", width: 414, height: 896, deviceScaleFactor: 2 },
];

const SHOTS = [
  { id: "schedule", url: "/", before: async (page) => {} },
  {
    id: "calendar",
    url: "/",
    before: async (page) => {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll("nav button"));
        const t = tabs.find((b) => /Calendar/.test(b.textContent ?? ""));
        t?.click();
      });
      await new Promise((r) => setTimeout(r, 300));
    },
  },
  {
    id: "staff",
    url: "/",
    before: async (page) => {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll("nav button"));
        const t = tabs.find((b) => /Staff/.test(b.textContent ?? ""));
        t?.click();
      });
      await new Promise((r) => setTimeout(r, 300));
    },
  },
  {
    id: "payroll",
    url: "/",
    before: async (page) => {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll("nav button"));
        const t = tabs.find((b) => /Payroll/.test(b.textContent ?? ""));
        t?.click();
      });
      await new Promise((r) => setTimeout(r, 300));
    },
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new" });

  try {
    for (const profile of PROFILES) {
      const page = await browser.newPage();
      await page.setViewport(profile);
      for (const shot of SHOTS) {
        const target = `${BASE}${shot.url}`;
        process.stdout.write(`→ ${profile.name} · ${shot.id}  `);
        try {
          await page.goto(target, { waitUntil: "networkidle2", timeout: 30000 });
          await shot.before(page);
          await new Promise((r) => setTimeout(r, 300));
          const file = path.join(OUT, `${shot.id}-${profile.name}.png`);
          await page.screenshot({ path: file, fullPage: true });
          console.log("✓", file);
        } catch (err) {
          console.error("✗", err.message);
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
