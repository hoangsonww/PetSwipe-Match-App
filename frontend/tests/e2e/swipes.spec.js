/* eslint-env jest */
/* global describe, test, expect */
const { test, expect } = require("@playwright/test");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

/* -------------------------------------------------------------------------- */
/* Shared helpers (same pattern as add-pet suite)                             */
/* -------------------------------------------------------------------------- */
async function seedJwt(page) {
  await page.addInitScript(() =>
    localStorage.setItem("jwt", "dummy.jwt.for.playwright"),
  );
}

async function stubCurrentUser(page) {
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "user@petswipe.io" },
      }),
    }),
  );
}

/* A minimal swipe payload the page expects. */
const fakeSwipes = [
  {
    id: "s1",
    liked: true,
    swipedAt: new Date("2025-01-01T12:00:00Z").toISOString(),
    pet: {
      id: "p1",
      name: "Mittens",
      type: "Cat",
      description: "Cute and cuddly",
      photoUrl: "https://cdn/mittens.jpg",
      shelterName: "Cats R Us",
      shelterContact: null,
      shelterAddress: null,
    },
  },
  {
    id: "s2",
    liked: false,
    swipedAt: new Date("2025-01-02T15:30:00Z").toISOString(),
    pet: {
      id: "p2",
      name: "Rex",
      type: "Dog",
      description: "Very good boy",
      photoUrl: null,
      shelterName: "Happy Tails",
      shelterContact: "555-123-4567",
      shelterAddress: "123 Bark St.",
    },
  },
];

/* Stub GET /swipes/me so the component renders instantly. */
async function stubSwipeEndpoint(page) {
  await page.route("**/api/swipes/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeSwipes),
    }),
  );
}

/* -------------------------------------------------------------------------- */

test.describe("📜 My Swipes page", () => {
  test.beforeEach(async ({ page }) => {
    await seedJwt(page);
    await stubCurrentUser(page);
    await stubSwipeEndpoint(page);
  });

  test("renders list of swipe cards", async ({ page }) => {
    // Guard if dev-server isn’t running
    try {
      await page.goto(`${BASE}/swipes`, { waitUntil: "networkidle" });
    } catch {
      test.skip(true, `Cannot reach ${BASE} – skipping “swipes” tests`);
      return;
    }

    // Two cards should appear with the pets’ names
    await expect(page.getByText("Mittens")).toBeVisible();
    await expect(page.getByText("Rex")).toBeVisible();

    // “Adopted” badge in green, “Passed” in red
    const adopted = page
      .locator("strong", { hasText: "Decision:" })
      .filter({ hasText: "Adopted" });
    const passed = page
      .locator("strong", { hasText: "Decision:" })
      .filter({ hasText: "Passed" });

    await expect(adopted).toHaveCount(1);
    await expect(passed).toHaveCount(1);

    // Snapshot of the first card—lightweight visual regression guard
    await expect(page.locator("card").first()).toHaveScreenshot(
      "swipes-card.png",
      { maxDiffPixels: 200 }, // generous threshold
    );
  });

  test("Back to Home button navigates correctly", async ({ page }) => {
    await page.goto(`${BASE}/swipes`);
    await page.getByRole("button", { name: /back to home/i }).click();
    await page.waitForURL("**/home");
    expect(page.url()).toMatch(/\/home$/);
  });
});
