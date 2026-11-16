import { expect, test } from '@playwright/test';

// Requires local FastAPI (:8000) and Vite (:5173). No NASA remote request is made automatically.
test('focused overview highlights the research journey and current data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'See beyond the flame.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /start research mission/i })).toBeVisible();
  await expect(page.getByText('Imported records')).toBeVisible();
  await expect(page.getByText(/descriptive only/i)).toBeVisible();
});

test('guided mission uses source data and advanced comparability guard', async ({ page }) => {
  await page.goto('/mission');
  await expect(page.getByRole('heading', { name: 'Follow the evidence.' })).toBeVisible();
  await page.getByRole('button', { name: /02 Observe Measurements/ }).click();
  await expect(page.getByText('20CAL10')).toBeVisible();
  await expect(page.getByRole('link', { name: /trace evidence/i })).toBeVisible();
  await page.getByRole('button', { name: /03 Compare Context/ }).click();
  await expect(page.getByText(/context fields differ/i)).toBeVisible();
  await page.getByRole('button', { name: /04 Question Scientific limits/ }).click();
  await page.getByRole('button', { name: /Ask Scientific Intelligence/ }).click();
  await expect(page.getByText(/insufficient evidence · abstention/i)).toBeVisible();
});

test('source library separates primary NASA measurements from historical context', async ({ page }) => {
  await page.goto('/sources');
  await expect(page.getByText('NASA PSI · Combustion Science')).toBeVisible();
  await expect(page.getByText('Apollo 1')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Mission lessons' }).click();
  await expect(page.getByText('Apollo 1')).toBeVisible();
  await expect(page.getByText('Apollo 13')).toBeVisible();
  await page.getByRole('tab', { name: 'Earth applications' }).click();
  await expect(page.getByText('Fire Detector')).toBeVisible();
});

for (const width of [390, 768, 1440]) {
  test(`mission home avoids horizontal scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 840 });
    await page.goto('/');
    await expect(page.locator('.ignite-hero')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
  });
}
