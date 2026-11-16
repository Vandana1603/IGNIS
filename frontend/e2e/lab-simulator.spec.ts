import { expect, test } from '@playwright/test';

test('liquid/solid model choices remain tied to NASA evidence', async ({ page }) => {
  await page.goto('/laboratory');
  await expect(page.getByRole('heading', { name: 'Interactive Microgravity Laboratory' })).toBeVisible();
  await expect(page.getByRole('button', { name: /FLEX • Droplet combustion/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /BASS-II • Solid fuels/ })).toBeVisible();
  await expect(page.locator('.ignis-gas-particle').first()).toBeVisible();
  await expect(page.getByText(/curated subset/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Original NASA PSI investigation/ }))
    .toHaveAttribute('href', /psi\.nasa\.gov\/physci\/repo\/data\/investigations\/PSI-69/);

  await page.getByRole('button', { name: 'Play model' }).click();
  await expect(page.getByRole('button', { name: 'Pause model' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause model' }).click();
  await page.getByRole('button', { name: /BASS-II • Solid fuels/ }).click();
  await expect(page.getByText('Fuel Sample Material')).toBeVisible();
  await expect(page.getByText(/illustrative, not NASA measurements/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Original NASA PSI investigation/ }))
    .toHaveAttribute('href', /psi\.nasa\.gov\/physci\/repo\/data\/investigations\/PSI-25/);
});

for (const width of [390, 768, 1440]) {
  test(`laboratory simulator fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/laboratory');
    await expect(page.locator('.ignis-lab-scene')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    expect(overflow).toBe(false);
  });
}
