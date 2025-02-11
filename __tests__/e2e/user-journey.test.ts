import { test, expect } from '@playwright/test';

test.describe('Touch Grass User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Mock geolocation
    await page.evaluate(() => {
      const mockGeolocation = {
        getCurrentPosition: (success: Function) => success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
          },
        }),
      };
      (navigator as any).geolocation = mockGeolocation;
    });
  });

  test('complete user journey - grass detection and attestation', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('text=/loading/i', { state: 'detached' });

    // Verify location detection
    await expect(page.locator('text=/detected/i')).toBeVisible();

    // Wait for grass detection to complete
    await page.waitForSelector('text=/analyzing/i', { state: 'detached' });

    // Connect wallet
    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

    // Handle Privy login modal
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill('test@example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for wallet connection
    await page.waitForSelector('text=/0x/i');

    // Create attestation
    const attestButton = page.getByRole('button', { name: /create attestation/i });
    await attestButton.click();

    // Wait for transaction confirmation
    await page.waitForSelector('text=/creating attestation/i', { state: 'detached' });

    // Verify attestation in history
    await expect(page.locator('text=/history/i')).toBeVisible();
    const attestationRows = await page.locator('role=row').all();
    expect(attestationRows.length).toBeGreaterThan(1);

    // View attestation details
    await attestationRows[1].click();
    await expect(page.locator('text=/details/i')).toBeVisible();
  });

  test('manual override flow', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('text=/loading/i', { state: 'detached' });

    // Click manual override
    await page.getByRole('button', { name: /override/i }).click();

    // Verify override active
    await expect(page.locator('text=/manual override active/i')).toBeVisible();

    // Connect wallet
    await page.getByRole('button', { name: /connect/i }).click();
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Create attestation with override
    await page.getByRole('button', { name: /create attestation/i }).click();

    // Verify attestation created
    await page.waitForSelector('text=/creating attestation/i', { state: 'detached' });
    await expect(page.locator('text=manual override')).toBeVisible();
  });

  test('error handling', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('text=/loading/i', { state: 'detached' });

    // Mock failed geolocation
    await page.evaluate(() => {
      const mockGeolocation = {
        getCurrentPosition: (_: any, error: Function) => error(new Error('Geolocation failed')),
      };
      (navigator as any).geolocation = mockGeolocation;
    });

    // Verify error message
    await expect(page.locator('text=/error getting location/i')).toBeVisible();

    // Try manual override
    await page.getByRole('button', { name: /override/i }).click();

    // Connect wallet
    await page.getByRole('button', { name: /connect/i }).click();
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Mock failed transaction
    await page.evaluate(() => {
      (window as any).ethereum = {
        request: () => Promise.reject(new Error('Transaction failed')),
      };
    });

    // Try to create attestation
    await page.getByRole('button', { name: /create attestation/i }).click();

    // Verify error message
    await expect(page.locator('text=/error creating attestation/i')).toBeVisible();
  });
}); 