# CLAUDE.md — shared-state-ui

## Project structure

This is a self-contained Next.js 15 App Router application inside the monorepo at `/workspace/shared-state-ui/`. All npm commands must be run from this directory.

## Build and test commands

```bash
npm run dev        # start dev server on :3000
npm run lint       # ESLint
npm run test       # Vitest unit/component tests (vitest run)
npm run test:watch # Vitest in watch mode
npx playwright test                          # E2E + a11y tests (requires browser)
PLAYWRIGHT_BROWSER_AVAILABLE=true npx playwright test  # force-run E2E
```

## Two separate test runners — do not confuse them

- **Vitest** (`npm run test`) — runs `__tests__/**/*.{js,jsx}`, configured in `vitest.config.js` with `environment: 'jsdom'`. The `e2e/` directory is explicitly excluded.
- **Playwright** (`npx playwright test`) — runs `e2e/**/*.spec.js`, configured in `playwright.config.js`.

## State management (Zustand + localStorage)

The Zustand store (`app/store/useSharedState.js`) uses `persist` middleware with the key `'shared-state-storage'`. Only `systemContext` and `taskData` are persisted (via `partialize`); `isLoading` and `error` are excluded to avoid stuck states across page reloads.

The E2E tests seed this key in localStorage before page load using `page.addInitScript`. Any future store shape changes must update both the `partialize` config and the E2E seed objects.

## Playwright environment detection

`playwright.config.js` probes whether the Chromium binary can execute in the current environment (Alpine/musl containers receive a glibc-linked binary that cannot run). When the binary is unavailable all E2E tests skip with exit code 0. Set `PLAYWRIGHT_BROWSER_AVAILABLE=true` to bypass the probe and force-run the tests on a compatible machine.

## Next.js Server Action pattern

`app/actions/processUserInput.js` is a Server Action (`"use server"` directive). It is called from client components as a regular async function. The E2E mock in `e2e/user-flow.spec.js` intercepts it by matching POST requests with the `next-action` header and returning a React Flight payload (`text/x-component`, body format `0:<json>\n`).

## Import alias

`jsconfig.json` maps `@/*` to `./*` (the `shared-state-ui/` project root). shadcn/ui components live at `components/ui/` (not `app/components/`). Application components live at `app/components/`.

## Key conventions

- Component tests use `@testing-library/react` + `vitest`. Mock Zustand state with `useSharedStateStore.setState({...})` in `beforeEach`.
- Always reset the full store state (`systemContext`, `taskData`, `isLoading`, `error`) in `beforeEach` to prevent cross-test leakage.
- FileReader stubs (`vi.stubGlobal`) must be cleaned up in `afterEach(() => vi.unstubAllGlobals())`.
