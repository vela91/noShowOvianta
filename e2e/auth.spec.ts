import { test, expect } from "playwright/test";

// These tests run without any stored session (unauthenticated)
test.use({ storageState: { cookies: [], origins: [] } });

test("redirects unauthenticated users from / to /login", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/\/login/);
});

test("logs in with correct password and lands on agenda", async ({ page }) => {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("DEMO_PASSWORD is not set in .env.local");

  await page.goto("/login");

  // Verify login page is rendered
  await expect(page.getByRole("heading", { name: /Ovianta NoShow Shield/i })).toBeVisible();

  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  // Should redirect to agenda
  await page.waitForURL("**/dashboard/agenda");
  await expect(page).toHaveURL(/\/dashboard\/agenda/);

  // At least one KPI card should be visible
  await expect(page.getByText(/Citas/i).first()).toBeVisible();
});

test("shows error message with wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#password", "contraseña-incorrecta");
  await page.click('button[type="submit"]');

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Contraseña incorrecta")).toBeVisible();
});
