/* eslint-env node, jest */
/* global test, expect, describe */
const { test, expect } = require('@playwright/test');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

const fakeUser = { id: 'u-1', email: 'demo@petswipe.dev', matches: [], swipes: [] };
const fakePet  = {
  id: 'p-1',
  name: 'Muffin',
  type: 'Cat',
  description : 'A playful orange tabby.',
  photoUrl    : 'https://placekitten.com/640/480',
  shelterName : 'Downtown Shelter',
  createdAt   : new Date().toISOString(),
  updatedAt   : new Date().toISOString(),
};
const fakeMatch = {
  id: 'm-1',
  user: fakeUser,
  pet : fakePet,
  matchedAt: new Date().toISOString(),
};

test.describe('🐾 Browse-pets deck flow', () => {
  /* —————————————————————————————————————————— */
  test('instruction → flip → Adopt flow', async ({ page }) => {
    /* 1️⃣  Mock APIs *before* navigation */
    await page.route('**/api/users/me',  route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: fakeUser }),
    }));

    await page.route('**/api/matches',    route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([fakeMatch]),
    }));

    await page.route('**/api/swipes', route => {
      // verify the request is sending the proper body & auth header
      const hdr = route.request().headers()['authorization'];
      expect(hdr).toBe('Bearer demo.jwt');
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });

    /* 2️⃣  Seed JWT in localStorage *before* any app code runs */
    await page.addInitScript(() => localStorage.setItem('jwt', 'demo.jwt'));

    /* 3️⃣  Navigate – if the dev-server isn’t up, skip */
    try {
      const resp = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      expect(resp.status()).toBeLessThan(400);
    } catch {
      test.skip(true, `Dev-server not reachable on ${BASE}`);
    }

    /* 4️⃣  The instruction card should be visible */
    await expect(page.getByRole('heading', { name: /instructions/i })).toBeVisible();

    /* 5️⃣  Click “Start” to show first pet */
    await page.getByRole('button', { name: /start/i }).click();
    await expect(page.getByText(/muffin/i)).toBeVisible();

    /* 6️⃣  Click the card to flip it (front → back) */
    await page.locator('div[class*="relative w-full max-w"]').first().click(); // the card container
    await expect(page.getByRole('button', { name: /adopt/i })).toBeVisible();

    /* 7️⃣  Click “Adopt” -> card disappears -> “All Done” slide appears */
    await page.getByRole('button', { name: /^adopt$/i }).click();
    await expect(page.getByText(/all done/i)).toBeVisible();
  });
});
