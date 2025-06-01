import { test, expect } from "@playwright/test";

test.describe("Home Page / Swipe Deck", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should redirect to login if not authenticated", async ({ page }) => {
    // Assuming the app redirects to /login when user is not logged in
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("should display instructions card after login simulation", async ({
    page,
    context,
  }) => {
    // Mock authentication by setting a cookie or localStorage, depending on implementation.
    // Example: if JWT is stored in localStorage under "token"
    await context.addCookies([
      {
        name: "token",
        value: "fake-jwt-token",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.reload();
    // Now we expect the instructions card (with "Instructions" heading) to appear
    const instructions = page.locator("h2").filter({ hasText: "Instructions" });
    await expect(instructions).toBeVisible();
    // Clicking "Start" should advance to first pet card (assuming no matches mock)
    const startButton = page.getByRole("button", { name: "Start" });
    await expect(startButton).toBeVisible();
  });

  test("should show loader if no pets returned", async ({ page, context }) => {
    // Simulate a user with no matches: set a cookie & mock fetch
    await context.addCookies([
      {
        name: "token",
        value: "fake-jwt-token",
        domain: "localhost",
        path: "/",
      },
    ]);
    // Intercept SWR fetch to return empty matches
    await page.route("**/api/matches", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.reload();
    // After instructions card is clicked, it should display loader screen
    await page.getByRole("button", { name: "Start" }).click();
    const loader = page.locator("div").filter({ hasText: /Loading/i });
    await expect(loader).toBeVisible();
  });
});
