
import { test, expect } from '@playwright/test';

test.describe('Splash Screen Visuals', () => {
  test('should display splash screen and server config modal correctly', async ({ page }) => {
    // 1. Install fake clock to control timing and prevent animation flakiness
    await page.clock.install();

    // Mock Math.random to ensure deterministic quote selection
    await page.addInitScript(() => {
      // @ts-ignore
      window.localStorage.setItem('racecoordinator_settings', JSON.stringify({
        racedaySetupWalkthroughSeen: true
      }));
      Math.random = () => 0.1;
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for splash screen to be visible
    const splashScreen = page.locator('.splash-screen');
    await expect(splashScreen).toBeVisible();

    // Wait for translations and quote to load
    await expect(page.locator('.quote-text')).toHaveText(/./, { timeout: 5000 });

    // Verify quote is present
    await expect(page.locator('.quote-container')).toBeVisible();

    // Disable all animations for stable screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
          transition-duration: 0s !important;
          animation-duration: 0s !important;
        }
      `
    });

    // 1. Capture Splash Screen (Busy Loop State)
    await expect(page).toHaveScreenshot('splash-screen-initial.png', { animations: 'disabled' });

    // 2. Open Server Config
    const serverBtn = page.locator('.server-config-btn');
    await expect(serverBtn).toBeVisible();
    await serverBtn.click();

    // Wait for modal
    const modal = page.locator('.server-config-modal');
    await expect(modal).toBeVisible();

    // 3. Capture Server Config Modal
    await expect(page).toHaveScreenshot('server-config-modal.png', { animations: 'disabled' });

    // 4. Close Modal
    await page.locator('.actions button').nth(1).click();
    await expect(modal).not.toBeVisible();
  });
});
