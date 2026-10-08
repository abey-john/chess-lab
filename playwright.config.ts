import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    browserName: 'firefox',
    headless: true,
    baseURL: 'http://localhost:5173/chess-lab/',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/chess-lab/',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
