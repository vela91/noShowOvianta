import { test as setup, expect } from "playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/session.json");

setup("authenticate and save session", async ({ page }) => {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("DEMO_PASSWORD is not set in .env.local");

  await page.goto("/login");
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard/agenda");

  // Persist cookies so authenticated tests reuse this session
  await page.context().storageState({ path: AUTH_FILE });
});
