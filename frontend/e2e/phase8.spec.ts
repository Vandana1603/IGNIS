import { expect, test } from '@playwright/test';

/** Runs only when FastAPI and Vite are both running. No NASA network request is automatic. */
test('interactive FLEX laboratory shows original source fields', async ({ page }) => {
  await page.goto('/laboratory');
  await expect(page.getByRole('heading', { name: 'Interactive Microgravity Laboratory' })).toBeVisible();
  await expect(page.getByText('Droplet initial diameter; mm')).toBeVisible();
  await page.getByRole('button', { name: 'Ambient conditions' }).last().click();
  await expect(page.getByText('Ambient pressure; mmHg')).toBeVisible();
  await page.getByRole('link', { name: /open complete evidence passport/i }).click();
  await expect(page).toHaveURL(/\/passport\/PSI-69-20CAL08/);
});

test('BASS-II laboratory does not label fan displays as calibrated velocities', async ({ page }) => {
  await page.goto('/laboratory');
  await page.getByRole('button', { name: /BASS-II • Solid fuels/ }).click();
  await page.getByRole('button', { name: 'Ambient conditions' }).last().click();
  await expect(page.getByText('Fan display')).toBeVisible();
  await expect(page.getByText(/not independently calibrated velocity measurements/i)).toBeVisible();
});

test('sync page is honest without clicking external network check', async ({ page }) => {
  await page.goto('/sync');
  await expect(page.getByRole('heading', { name: 'Live NASA Research Sync' })).toBeVisible();
  await expect(page.getByText('Auto-imported records')).toBeVisible();
  await expect(page.getByText(/not live ISS sensor feeds/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /check both NASA sources/i })).toBeVisible();
});

for (const width of [390, 768, 1440]) {
  test(`new laboratory layout fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 });
    await page.goto('/laboratory');
    await expect(page.locator('.phase8-schematic-svg')).toBeVisible();
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflows).toBe(false);
  });
}
