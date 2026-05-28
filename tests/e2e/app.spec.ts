import { expect, test } from '@playwright/test';

test('app renders core UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AudioSync', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /add book/i })).toBeVisible();
  await expect(page.getByText('AudioSync Player')).toBeVisible();
});
