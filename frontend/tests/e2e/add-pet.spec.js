/* eslint-env jest */
/* global test, expect, describe */
const { test, expect } = require('@playwright/test');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Pretend the user is logged-in before any front-end code runs. */
async function seedJwt(page) {
  await page.addInitScript(() =>
    localStorage.setItem('jwt', 'dummy.jwt.for.playwright'),
  );
}

/** Stub `/api/users/me` so the auth-guard on the page passes. */
async function stubCurrentUser(page) {
  await page.route('**/api/users/me', route =>
    route.fulfill({
      status      : 200,
      contentType : 'application/json',
      body        : JSON.stringify({
        user: { id: 'u1', email: 'admin@petswipe.io' },
      }),
    }),
  );
}

/** Stub the backend calls used by the *Add Pet* flow. */
async function stubPetEndpoints(page) {
  /* 1️⃣  POST /pets (new pet metadata) */
  await page.route('**/api/pets', async route => {
    if (route.request().method() !== 'POST') return route.continue();

    // Sanity-check the JSON the UI sends:
    const body = JSON.parse(route.request().postData() || '{}');
    expect(body).toMatchObject({
      name        : 'Buddy',
      type        : 'Golden Retriever',
      shelterName : 'Happy Tails',
    });

    // Respond with a fake pet id
    await route.fulfill({
      status      : 201,
      contentType : 'application/json',
      body        : JSON.stringify({
        pet: { id: 'pet-123', ...body },
      }),
    });
  });

  /* 2️⃣  POST /pets/:id/photo (image upload) */
  await page.route('**/api/pets/pet-123/photo', route =>
    route.fulfill({
      status      : 200,
      contentType : 'application/json',
      body        : JSON.stringify({ photoUrl: 'https://cdn/pet-123.jpg' }),
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Test suite                                                                 */
/* -------------------------------------------------------------------------- */

test.describe('➕  Add Pet screen', () => {
  /** Every test gets a logged-in stubbed environment. */
  test.beforeEach(async ({ page }) => {
    await seedJwt(page);
    await stubCurrentUser(page);
  });

  test('shows validation error when required fields are missing', async ({
                                                                           page,
                                                                         }) => {
    // Navigate – soft-skip if the dev-server isn’t up
    try {
      await page.goto(`${BASE}/add-pet`, { waitUntil: 'domcontentloaded' });
    } catch {
      test.skip(true, `Cannot reach ${BASE} – skipping “add-pet” tests`);
      return;
    }

    await page.getByRole('button', { name: /^add pet$/i }).click();
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('submits form, uploads photo & redirects to /home', async ({
                                                                    page,
                                                                  }) => {
    await stubPetEndpoints(page);

    await page.goto(`${BASE}/add-pet`);

    // Fill the form
    await page.getByLabel(/^name$/i).fill('Buddy');
    await page.getByLabel(/breed.*type/i).fill('Golden Retriever');
    await page.getByLabel(/shelter name/i).fill('Happy Tails');

    // Select a photo (buffer avoids needing a fixture file)
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /choose photo/i }).click(),
    ]);

    await chooser.setFiles({
      name     : 'buddy.jpg',
      mimeType : 'image/jpeg',
      buffer   : Buffer.from([0xff, 0xd8, 0xff]), // tiny fake JPG
    });

    // Submit
    await page.getByRole('button', { name: /^add pet$/i }).click();

    // Success toast appears…
    await expect(page.getByText(/pet added successfully/i)).toBeVisible();

    // …and we eventually land on /home
    await page.waitForURL('**/home');
    expect(page.url()).toMatch(/\/home$/);
  });
});
