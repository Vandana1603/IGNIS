import { test, expect } from '@playwright/test';

/** Requires the existing local FastAPI and Vite servers; no NASA network access. */
test('homepage finding uses the validated FLEX evidence rather than a generic chart', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Same ending. Different starting conditions.' })).toBeVisible();
  await expect(page.getByText('20CAL10', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('20CAL12', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Inspect comparison/i })).toBeVisible();
});

test('investigation atlas clearly separates source context from imported records', async ({ page }) => {
  await page.goto('/mission');
  await page.getByText('Discover related NASA investigations').click();
  await page.getByRole('button', { name: 'Smoke & dust' }).click();
  await expect(page.getByText('Source context only · no imported measurements')).toBeVisible();
  await page.getByRole('button', { name: 'Droplets' }).click();
  await expect(page.getByText(/imported test records from one investigation/)).toBeVisible();
});

test('lunar research gap reports missing imported data rather than predicting fire safety', async ({ page }) => {
  await page.goto('/mission');
  await page.getByRole('button', { name: /Question Scientific limits/ }).click();
  await expect(page.getByText('Next frontier: lunar conditions')).toBeVisible();
  await expect(page.getByText('No such experiments in this imported catalog')).toBeVisible();
});
