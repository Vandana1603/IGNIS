/** Real-browser E2E tests against the existing Vite + FastAPI application.
 * No NASA measurements are mocked. The outage test intentionally aborts requests.
 */
import { expect, test } from '@playwright/test';

test('mission overview loads the real local catalog', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('NASA catalog connected')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByText(/curated|transcrib/i).first()).toBeVisible();
});

test('research search links a real result to its evidence passport', async ({ page }) => {
  await page.goto('/research');
  await page.getByLabel('RESEARCH QUESTION OR SEARCH TERMS').fill('methanol extinction');
  await page.getByRole('button', { name: /search evidence/i }).click();
  await expect(page.getByText('2 matching records')).toBeVisible();
  await page.getByRole('link', { name: /evidence passport/i }).first().click();
  await expect(page).toHaveURL(/\/passport\/PSI-69-20CAL(10|12)/);
  await expect(page.getByText('Advanced Evidence Audit')).toBeVisible();
});

test('scientific assistant cites a source and abstains on unsupported safety claims', async ({ page }) => {
  await page.goto('/insights');
  const input = page.getByLabel('YOUR RESEARCH QUESTION');
  await input.fill('What was the burn time of FLEX test 20CAL10?');
  await page.getByRole('button', { name: /analyze evidence/i }).click();
  await expect(page.getByText('Direct observations')).toBeVisible();
  await expect(page.getByText('Burn time; s', { exact: false }).first()).toBeVisible();
  await input.fill('Which material is safest for spacecraft?');
  await page.getByRole('button', { name: /analyze evidence/i }).click();
  await expect(page.getByText('Insufficient evidence — answer withheld')).toBeVisible();
});

test('experiment explorer renders actual imported FLEX records and compatible metric controls', async ({ page }) => {
  await page.goto('/experiments');
  await expect(page.getByRole('heading', { name: 'Experiment Explorer' })).toBeVisible();
  await expect(page.getByText('20CAL10', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Scientific measurement chart')).toBeVisible();
  await expect(page.getByText('Verified metric')).toBeVisible();
});

test('comparison lab blocks BASS-II versus FLEX numeric comparison', async ({ page }) => {
  await page.goto('/compare?left=PSI-25-B1&right=PSI-69-20CAL10');
  await expect(page.getByText('Advanced Comparability Guard')).toBeVisible();
  await expect(page.getByText('cross investigation blocked', { exact: false })).toBeVisible();
  await expect(page.getByText('No shared numeric comparison')).toBeVisible();
});

test('API outage produces visible error, not substitute measurements', async ({ page }) => {
  await page.route('**/api/v3/search', route => route.abort());
  await page.goto('/research');
  await page.getByRole('button', { name: /search evidence/i }).click();
  await expect(page.getByText(/cannot reach|failed|error|network/i).first()).toBeVisible();
  await expect(page.getByText('2 matching records')).toHaveCount(0);
});

for (const width of [390, 768, 1440]) {
  test(`responsive navigation and horizontal layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/insights');
    await expect(page.getByRole('main')).toBeVisible();
    if (width <= 760) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.locator('aside[aria-label="Main navigation"]').getByText('Scientific Insights')).toBeVisible();
      await page.getByRole('button', { name: 'Close navigation' }).last().click();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow, `Unexpected document-level horizontal scrolling at ${width}px`).toBe(false);
  });
}
