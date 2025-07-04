/* eslint-env node, jest */
/* global test, expect, describe */

const { test, expect } = require("@playwright/test");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

/**
 * Registers the network stubs (profile fetch + update) that
 * the Profile screen relies on.
 */
async function stubProfileRoutes(page) {
  // ── 1 ▸ current user (GET)
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "test@petswipe.io",
          name: "Play Tester",
          dob: "1990-01-01",
          bio: "Ex-demo user",
          avatarUrl: null,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-02T00:00:00Z",
          matches: [],
          swipes: [],
        },
      }),
    }),
  );

  // ── 2 ▸ profile update (PUT)
  await page.route("**/api/users/me", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    expect(body).toMatchObject({ name: "Renamed User" });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { ...body, id: "u1", email: "test@petswipe.io" },
      }),
    });
  });
}

test.describe("👤 Profile screen", () => {
  test("user can open, edit & save profile", async ({ page }) => {
    // inject a dummy JWT so the front-end thinks we’re logged-in
    await page.addInitScript(() => localStorage.setItem("jwt", "test.jwt"));

    await stubProfileRoutes(page);

    // Navigate – soft-skip when dev-server is absent
    let resp;
    try {
      resp = await page.goto(`${BASE}/profile`, {
        waitUntil: "domcontentloaded",
      });
    } catch {
      test.skip(
        true,
        `Server not reachable on ${BASE} – skipping profile test`,
      );
      return;
    }
    expect(resp.status()).toBeLessThan(400);

    // Avatar + email rendered
    await expect(page.getByText("test@petswipe.io")).toBeVisible();

    // ── Open “Edit Profile” dialog
    await page.getByRole("button", { name: /edit profile/i }).click();
    const dialog = page.getByRole("dialog", { name: /edit profile/i });
    await expect(dialog).toBeVisible();

    // Change the “Full Name” field
    const nameInput = dialog.getByLabel(/full name/i);
    await nameInput.fill("Renamed User");

    // Save
    await dialog.getByRole("button", { name: /^save$/i }).click();

    // Toast confirms
    await expect(page.getByText(/profile saved/i)).toBeVisible();

    // Card shows the new name (dialog auto-closed)
    await expect(page.getByText("Renamed User")).toBeVisible();
  });
});
