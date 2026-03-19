import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.test.js',
  use: {
    baseURL: 'http://localhost:3999',
  },
  webServer: {
    command: 'npx serve -l 3999 -s .',
    port: 3999,
    reuseExistingServer: true,
  },
});
