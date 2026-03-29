import { test, expect } from "playwright/test";

test.describe("patients table", () => {
  test("shows table with at least one patient row", async ({ page }) => {
    await page.goto("/dashboard/pacientes");

    // Wait for the table to load (Suspense resolves)
    const firstPatientLink = page.getByRole("link").filter({ hasText: /\S/ }).first();
    await expect(firstPatientLink).toBeVisible({ timeout: 15_000 });

    // Badge showing patient count (e.g. "75 pacientes") should be present
    await expect(page.getByText(/\d+ pacientes?/)).toBeVisible();
  });

  test("navigates to patient detail on row click", async ({ page }) => {
    await page.goto("/dashboard/pacientes");

    // Wait for the first data row (nth(1) skips the header row)
    const firstDataRow = page.getByRole("table").getByRole("row").nth(1);
    await expect(firstDataRow).toBeVisible({ timeout: 15_000 });

    // Read patient name from the link inside the row
    const patientName = await firstDataRow.getByRole("link").textContent();

    // Click a cell without a link (specialty = 3rd cell) to trigger the row's onClick handler
    // rather than the <Link> inside the name cell — ensures the row handler is what navigates
    await firstDataRow.getByRole("cell").nth(2).click();

    // URL should change to a patient detail page
    await page.waitForURL(/\/dashboard\/pacientes\/.+/);

    // Patient name should appear in the page heading
    if (patientName?.trim()) {
      await expect(
        page.getByRole("heading", { name: new RegExp(patientName.trim(), "i") })
      ).toBeVisible();
    }

    // Risk badge should be visible
    await expect(page.getByText(/riesgo/i).first()).toBeVisible();
  });
});

test.describe("patient edit", () => {
  test("edits patient first name and sees the updated value", async ({ page }) => {
    await page.goto("/dashboard/pacientes");

    // Navigate to first patient detail
    const firstLink = page.getByRole("table").getByRole("link").first();
    await expect(firstLink).toBeVisible({ timeout: 15_000 });
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/pacientes\/.+/);

    // Open edit dialog
    await page.getByRole("button", { name: /Editar paciente/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Clear and type a new first name with a unique suffix to avoid conflicts
    const newFirstName = `TestE2E${Date.now().toString().slice(-4)}`;
    await page.fill("#firstName", newFirstName);

    // Save
    await page.getByRole("button", { name: /Guardar cambios/i }).click();

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    // Updated name should appear in the heading
    await expect(
      page.getByRole("heading", { name: new RegExp(newFirstName, "i") })
    ).toBeVisible({ timeout: 10_000 });
  });
});
