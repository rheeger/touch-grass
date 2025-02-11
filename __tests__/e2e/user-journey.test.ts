import { test, expect } from '@playwright/test';

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
}

interface GeolocationError {
  code: number;
  message: string;
}

type PositionCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationError) => void;

test.describe('Touch Grass User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Set up response mocking
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock Google Maps API responses
    await page.route('**/maps/api/place/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          results: [{
            geometry: {
              location: { lat: 40.7128, lng: -74.0060 },
            },
            types: ['park'],
            name: 'Central Park',
          }],
          status: 'OK',
        }),
      });
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Mock geolocation before page load
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 10,
              },
              timestamp: Date.now(),
            });
          },
          watchPosition: () => 0,
          clearWatch: () => {},
        },
        configurable: true,
      });
    });
  });

  test('complete user journey - grass detection and attestation', async ({ page }) => {
    // Wait for initial load and location detection
    await expect(page.locator('text=/loading/i')).toBeVisible();
    await page.waitForSelector('text=/loading/i', { state: 'detached' });

    // Wait for location to be processed
    await expect(page.locator('text=/detected/i')).toBeVisible({ timeout: 30000 });

    // Wait for grass detection to complete
    await expect(page.locator('text=/analyzing/i')).toBeVisible();
    await page.waitForSelector('text=/analyzing/i', { state: 'detached', timeout: 30000 });

    // Connect wallet
    await page.getByRole('button', { name: /connect/i }).click();
    
    // Mock Privy auth response
    await page.evaluate(() => {
      window.localStorage.setItem('privy:auth:token', 'mock-token');
      window.localStorage.setItem('privy:auth:user', JSON.stringify({
        email: { address: 'test@example.com', verified: true },
        wallet: { address: '0x123' },
      }));
    });

    // Create attestation
    await expect(page.getByRole('button', { name: /create attestation/i })).toBeVisible();
    await page.getByRole('button', { name: /create attestation/i }).click();

    // Wait for transaction confirmation
    await expect(page.locator('text=/creating attestation/i')).toBeVisible();
    await page.waitForSelector('text=/creating attestation/i', { state: 'detached', timeout: 30000 });

    // Verify attestation in history
    await expect(page.locator('text=/history/i')).toBeVisible();
  });

  test('manual override flow', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('text=/loading/i')).toBeVisible();
    await page.waitForSelector('text=/loading/i', { state: 'detached' });

    // Click manual override
    await expect(page.getByRole('button', { name: /override/i })).toBeVisible();
    await page.getByRole('button', { name: /override/i }).click();

    // Verify override active
    await expect(page.locator('text=/manual override active/i')).toBeVisible();

    // Connect wallet
    await page.getByRole('button', { name: /connect/i }).click();
    
    // Mock Privy auth response
    await page.evaluate(() => {
      window.localStorage.setItem('privy:auth:token', 'mock-token');
      window.localStorage.setItem('privy:auth:user', JSON.stringify({
        email: { address: 'test@example.com', verified: true },
        wallet: { address: '0x123' },
      }));
    });

    // Create attestation with override
    await expect(page.getByRole('button', { name: /create attestation/i })).toBeVisible();
    await page.getByRole('button', { name: /create attestation/i }).click();

    // Verify attestation created
    await expect(page.locator('text=/creating attestation/i')).toBeVisible();
    await page.waitForSelector('text=/creating attestation/i', { state: 'detached', timeout: 30000 });
  });

  test('error handling', async ({ page }) => {
    // Mock failed geolocation
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_: PositionCallback, error: ErrorCallback) => {
            error({
              code: 1,
              message: 'Geolocation failed',
            });
          },
          watchPosition: () => 0,
          clearWatch: () => {},
        },
        configurable: true,
      });
    });

    // Reload page with failed geolocation
    await page.reload();

    // Wait for error message
    await expect(page.locator('text=/error getting location/i')).toBeVisible({ timeout: 30000 });

    // Try manual override
    await expect(page.getByRole('button', { name: /override/i })).toBeVisible();
    await page.getByRole('button', { name: /override/i }).click();

    // Connect wallet
    await page.getByRole('button', { name: /connect/i }).click();
    
    // Mock Privy auth response with error
    await page.evaluate(() => {
      window.localStorage.setItem('privy:auth:error', JSON.stringify({
        message: 'Transaction failed',
      }));
    });

    // Try to create attestation
    await expect(page.getByRole('button', { name: /create attestation/i })).toBeVisible();
    await page.getByRole('button', { name: /create attestation/i }).click();

    // Verify error message
    await expect(page.locator('text=/error creating attestation/i')).toBeVisible({ timeout: 30000 });
  });
}); 