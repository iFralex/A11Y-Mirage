# Shared State UI

A Next.js (App Router) prototype implementing an accessible "Shared State" AI interaction paradigm powered by Google Gemini.

## What this app does

**Phase 1 – Context Initialization:** On first load the user uploads a `.txt` file or pastes text that serves as the AI system context. This is persisted across browser sessions via Zustand + localStorage.

**Phase 2 – AI Prompt & Task Rendering:** After saving context the user submits a free-text prompt. A Next.js Server Action calls Gemini Flash, which returns a structured JSON task. The UI renders an accessible form matching the task type (`select_option`, `boolean_confirm`, or `text_input`). The user fills in the form and clicks Conferma to confirm their response.

## Prerequisites

- Node.js 18+
- A Google Gemini API key

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

## Error logging

Gemini API errors after all retries are appended to `logs/gemini-errors.log`.
