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

The Zustand store (`app/store/useSharedState.js`) uses `persist` middleware with the key `'shared-state-storage'`. The following fields are persisted (via `partialize`): `systemContext`, `taskData`, `workflow`, `currentStepIndex`, `estimatedRemainingSteps`, `userProfile`. The fields `isLoading`, `error`, and `telemetry` are excluded to avoid stuck states across page reloads.

The E2E tests seed this key in localStorage before page load using `page.addInitScript`. Any future store shape changes must update both the `partialize` config and the E2E seed objects.

The store is exposed on `window.__sharedStore` in browser environments for E2E test instrumentation. Use this to inject non-persisted state (e.g. `telemetry`) that cannot be seeded via localStorage:
```js
await page.evaluate(() => {
  window.__sharedStore.setState({ telemetry: { localCognitiveLoadScore: 9 } });
});
```

## Playwright environment detection

`playwright.config.js` probes whether the Chromium binary can execute in the current environment (Alpine/musl containers receive a glibc-linked binary that cannot run). When the binary is unavailable all E2E tests skip with exit code 0. Set `PLAYWRIGHT_BROWSER_AVAILABLE=true` to bypass the probe and force-run the tests on a compatible machine.

## Next.js Server Action pattern

`app/actions/processUserInput.js` is a Server Action (`"use server"` directive). It is called from client components as a regular async function. The E2E mock in `e2e/user-flow.spec.js` intercepts it by matching POST requests with the `next-action` header and returning a React Flight payload (`text/x-component`, body format `0:<json>\n`).

## Import alias

`jsconfig.json` maps `@/*` to `./*` (the `shared-state-ui/` project root). shadcn/ui components live at `components/ui/` (not `app/components/`). Application components live at `app/components/`.

Currently installed shadcn/ui components (under `components/ui/`): `alert`, `badge`, `button`, `collapsible`, `dialog`, `label`, `select`, `slider`, `switch`.

## Workflow architecture

`app/page.jsx` is a thin async Server Component that renders `app/main.jsx`. `main.jsx` is a Client Component (`"use client"`) that drives the top-level flow:
- No `systemContext` → render `ContextSetup`
- `systemContext` set but no workflow steps → render the initial prompt form; on submit call `processWithGemini` with an empty workflow and add the first step via `addStep`
- Workflow steps present → render `WorkflowStepContainer`
- Always renders `WorkflowDebugConsole` (visible only in `NODE_ENV=development`)

`WorkflowStepContainer` owns step submission: reads the current step from the store, calls `DynamicStepRenderer` via an imperative ref to validate and collect responses, then calls `processWithGemini(userInput, systemContext, updatedWorkflow, { userProfile, telemetry })` to obtain the next step. It also calls `useStepTelemetry(stepRendererRef)` to drive the real-time cognitive load scoring; `resetTelemetry()` is called on each step submission.

`DynamicStepRenderer` uses `forwardRef` + `useImperativeHandle` to expose two methods:
- `validate()` — runs required-field validation, sets inline errors, returns boolean
- `getResponses()` — returns the current `{ inputId: value }` map

`app/utils/workflowHelpers.js` exports pure functions:
- `buildConversationMemory(steps)` — formats step history (uses `stateSummary` field, not `questionSummary`)
- `extractStepResults(steps)` — returns `[{ stepId, stepNumber, response }]` for all steps with a response
- `mapResponsesToProfile(steps)` — maps accessibility onboarding responses to the `userProfile` schema. The LLM must use these canonical input IDs: `sensory_vision`, `sensory_color`, `cognitive_maxInputsPerStep`, `cognitive_requiresDecisionSupport`, `cognitive_safeMode`, `interaction_preferredModality`, `interaction_progressiveDisclosure`.

`app/utils/semanticSpeech.js` exports speech-synthesis helpers:
- `generateSemanticSummary(stepData)` — builds a spoken string from step data
- `speakText(text)` — cancels any current utterance then speaks via `window.speechSynthesis`
- `cancelSpeech()` — immediately cancels any current utterance

`app/hooks/useStepTelemetry.js` — custom hook that tracks time, focus switches, and error count per step, computing a `localCognitiveLoadScore` (0–10) every 2 seconds via `setInterval`. Scoring formula: `(timeInSeconds * 0.1) + (focusSwitches * 0.5) + (errorCount * 2)`, capped at 10. Returns `{ resetTelemetry }` — call this on step submission to zero the counters.

The Server Action `processWithGemini` signature is `(userInput, systemContext, workflowState, accessibilityContext = {})`. `accessibilityContext` is `{ userProfile, telemetry }` — both optional. The E2E mock intercepts POST requests with the `next-action` header; the mock payload must include all four arguments in the React Flight format.

The LLM response schema requires `isFinalStep` (boolean). A final step (`isFinalStep: true`) may have an empty `inputs` array — validation does not reject this. The `finalActionLabel` field is only valid when `isFinalStep` is true.

## Key conventions

- Component tests use `@testing-library/react` + `vitest`. Mock Zustand state with `useSharedStateStore.setState({...})` in `beforeEach`.
- Always reset the full store state in `beforeEach` to prevent cross-test leakage: `systemContext`, `taskData`, `isLoading`, `error`, `workflow` (to `{ taskId: null, taskName: "", steps: [] }`), `currentStepIndex` (to `0`), `estimatedRemainingSteps` (to `null`), `userProfile` (to `defaultUserProfile` from the store), and `telemetry` (to `defaultTelemetry` from the store). Both `defaultUserProfile` and `defaultTelemetry` are exported from `app/store/useSharedState.js`.
- FileReader stubs (`vi.stubGlobal`) must be cleaned up in `afterEach(() => vi.unstubAllGlobals())`.
