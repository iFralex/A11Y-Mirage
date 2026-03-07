# Shared State UI

A Next.js (App Router) prototype implementing an accessible "Shared State" AI interaction paradigm powered by Google Gemini.

## What this app does

**Phase 1 – Context Initialization:** On first load the user uploads a `.txt` file or pastes text that serves as the AI system context. This is persisted across browser sessions via Zustand + localStorage.

**Phase 2 – AI Workflow:** After saving context the user submits a free-text prompt. A Next.js Server Action calls Gemini, which returns the first step of a dynamic multi-step workflow as structured JSON. Each step contains one or more input fields the user fills in. On submission, the completed step is sent back to Gemini which generates the next step incorporating all prior responses. The workflow continues until Gemini signals completion with `isFinalStep: true`, at which point a final summary and completion button are shown.

Features:
- Navigate backward through completed steps using the Previous Step button
- Reset the entire workflow at any time with Reset Workflow, which returns to the context setup screen
- Each step displays a progress indicator (~N steps remaining) and a state summary of decisions made so far
- Generated questions and labels adapt to the language of the user's input

## Prerequisites

- Node.js 18+
- A Google Gemini API key with access to the `gemini-2.5-flash` model

## Setup

```bash
npm install
```

Create a `.env` file in this directory with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

Then start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Running tests

```bash
# Unit and component tests (Vitest)
npm run test
npm run test:watch

# End-to-end and accessibility tests (Playwright)
# Requires a glibc-compatible environment with Chromium available.
npx playwright test

# Force-enable E2E tests when browser binary is available:
PLAYWRIGHT_BROWSER_AVAILABLE=true npx playwright test
```

Note: E2E tests skip automatically (exit 0) in Alpine/musl environments where the glibc-linked Chromium binary cannot execute.

## Linting

```bash
npm run lint
```

## Logging

Gemini API errors after all retries are appended to `logs/gemini-errors.log`.

Successful workflow interactions are appended to `logs/workflow-history.log`. Each entry is a JSON object with fields: `timestamp`, `taskId`, `stepNumber`, `userResponse`, `modelResponse`.
