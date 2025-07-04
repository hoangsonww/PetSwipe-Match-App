/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests/e2e',
  testMatch: '**/*.spec.@(js|ts)',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
  },
};
