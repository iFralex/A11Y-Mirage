// Set browsers path before config is evaluated (installed to /tmp due to permissions)
process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || '/tmp/playwright-browsers';

const { defineConfig, devices } = require('@playwright/test');
const { execFileSync } = require('child_process');

// Detect whether the Playwright Chromium binary can actually execute in this
// environment.  Alpine musl environments receive a glibc-linked binary which
// cannot run without the glibc loader (/lib/ld-linux-aarch64.so.1).
// When the binary is not executable all tests are skipped (exit code 0).
function isBrowserAvailable() {
  if (process.env.PLAYWRIGHT_BROWSER_AVAILABLE === 'true') return true;
  try {
    // A benign flag that makes chromium print its version and exit immediately.
    execFileSync(
      '/tmp/playwright-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell',
      ['--version'],
      { timeout: 3000, stdio: 'ignore' }
    );
    return true;
  } catch {
    return false;
  }
}

const BROWSER_AVAILABLE = isBrowserAvailable();

// Expose the result so test files can read it at load time.
process.env.PLAYWRIGHT_BROWSER_AVAILABLE = BROWSER_AVAILABLE ? 'true' : 'false';

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only spin up the dev server when the browser is available and can run tests
  ...(BROWSER_AVAILABLE
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 120000,
        },
      }
    : {}),
});
