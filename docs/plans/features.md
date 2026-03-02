# Plan: Shared State UI Prototype

## Overview
Build a Next.js (App Router, JavaScript only) prototype featuring an accessible "Shared State" AI interaction paradigm. The flow starts with a Context Initialization screen where the user provides a `.txt` file or pastes text to simulate conversation history. The system uses Gemini 3 Flash via Server Actions and "Structured Outputs" to generate UI components dynamically based on the user's prompt and the provided context. The application strictly follows WCAG 2.1 guidelines (focus management, semantic HTML, aria-live) and manages state via Zustand with local caching.

## Validation Commands
- `npm run lint`
- `npm run test`
- `npx playwright test`

### Task 1: Project Initialization & Tooling Setup
- [x] Run: `npx create-next-app@latest shared-state-ui --javascript --tailwind --eslint --app --no-src-dir --import-alias "@/*"`
- [x] Run: `cd shared-state-ui` (All following commands assume this root directory)
- [x] Run: `npx shadcn@latest init -d` to initialize shadcn/ui with default settings
- [x] Run: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom eslint-plugin-jsx-a11y @axe-core/playwright @playwright/test`
- [x] Update `.eslintrc.json` to include `"extends":["next/core-web-vitals", "plugin:jsx-a11y/recommended"]`
- [x] Create `vitest.config.js` in the root with `environment: 'jsdom'` and React plugin enabled
- [x] Update `package.json` scripts: add `"test": "vitest run"` and `"test:watch": "vitest"`
- [x] Copy the .env file from the project root into the shared-state folder
- [x] Mark completed

### Task 2: State Management (Zustand) & Local Caching
- [x] Run: `npm install zustand`
- [x] Create folder: `mkdir -p app/store`
- [x] Create file `app/store/useSharedState.js`
- [x] In `useSharedState.js`, import `create` from `zustand` and `persist` from `zustand/middleware`
- [x] Define and export `useSharedStateStore` using `persist` (name: `'shared-state-storage'`)
- [x] Add state variables: `systemContext` (default: `""`), `taskData` (default: `null`), `isLoading` (default: `false`), `error` (default: `null`)
- [x] Add actions: `setSystemContext(text)`, `updateTaskData(data)`, `setLoading(boolean)`, `setError(string | null)`, `clearError()`
- [x] Mark completed

### Task 3: Context Initialization UI (Setup Phase)
- [x] Run: `npx shadcn@latest add textarea button card`
- [x] Create folder: `mkdir -p app/components`
- [x] Create file `app/components/ContextSetup.jsx`
- [x] Import `useSharedStateStore`, shadcn `Textarea`, `Button`, and `Card` components
- [x] Inside `ContextSetup.jsx`, create a state `localContext` using `useState("")`
- [x] Add an `<input type="file" accept=".txt">` that reads the file via `FileReader` and sets its content to `localContext`
- [x] Add a `Textarea` linked to `localContext` to allow manual pasting/editing
- [x] Add a "Salva Contesto" `Button` that calls `setSystemContext(localContext)` on click
- [x] Mark completed

### Task 4: Backend Server Actions & Gemini Integration
- [x] Run: `npm install @google/generative-ai`
- [x] Create folders: `mkdir -p app/actions logs`
- [x] Create file `app/actions/processUserInput.js` and add `"use server";` at the exact top
- [x] Initialize `GoogleGenerativeAI` with `process.env.GEMINI_API_KEY` and set model to `"gemini-3-flash"`
- [x] Configure `responseSchema` to strictly enforce: `taskId` (string), `taskType` (enum: `meeting_coordination`, `document_approval`, `data_collection`), `stateSummary` (string), `pendingAction` (object with `type` enum `select_option`, `boolean_confirm`, `text_input`; `question` string; `options` array of strings). Set `responseMimeType: "application/json"`.
- [x] Export async function `processWithGemini(userPrompt, systemContext)`
- [x] Implement a `for` loop (max 2 iterations: initial + 1 retry) wrapping the Gemini call `model.generateContent(systemContext + "\n\nUser Prompt: " + userPrompt)`
- [x] Inside loop on success: return `JSON.parse(response.text())`
- [x] On failure of final retry: use Node `fs.appendFileSync('logs/gemini-errors.log', JSON.stringify({error, userPrompt, systemContext}))` and throw `"Errore di connessione al modello."`
- [x] Mark completed

### Task 5: Accessible Generic UI Components (shadcn/ui)
- [x] Run: `npx shadcn@latest add input radio-group checkbox label alert`
- [x] Create file `app/components/DynamicTaskRenderer.jsx`
- [x] Accept `pendingAction` object as a prop
- [x] Implement a `switch(pendingAction.type)` statement
- [x] Case `'select_option'`: Render `<fieldset>` containing a `<legend>` with `pendingAction.question`. Inside, map over `pendingAction.options` returning shadcn `RadioGroup` and `Label`. Add `htmlFor` to labels matching the radio IDs.
- [x] Case `'boolean_confirm'`: Render a single shadcn `Checkbox` (id="confirm-action") linked to a `Label` showing `pendingAction.question` via `htmlFor="confirm-action"`.
- [x] Case `'text_input'`: Render a shadcn `Label` and `Input` with matching `htmlFor` and `id` showing `pendingAction.question`.
- [x] Mark completed

### Task 6: Main Container & A11y Focus Management
- [x] Create file `app/components/DynamicTaskContainer.jsx`
- [x] Import `useSharedStateStore`, `DynamicTaskRenderer`, and shadcn `Alert`
- [x] Get `taskData`, `isLoading`, and `error` from Zustand store
- [x] Add `const titleRef = useRef(null)`
- [x] Add `useEffect` that checks: `if (taskData && !isLoading && !error)` then `titleRef.current?.focus()`
- [x] Render a main `<div role="region" aria-labelledby="task-title">`
- [x] Render `<div aria-live="assertive" className="sr-only">`: if `isLoading` is true render text "Elaborazione in corso...".
- [x] Render visual UI: if `isLoading` show visual spinner, if `error` show shadcn `Alert` with error message.
- [x] If `taskData` exists, render `<h2 id="task-title" tabIndex="-1" ref={titleRef}>Task: {taskData.taskType}</h2>`
- [x] Render `<p>{taskData.stateSummary}</p>`
- [x] Render `<DynamicTaskRenderer pendingAction={taskData.pendingAction} />`
- [x] Add a "Conferma" `Button` below the renderer to close the loop (console.log the selected data for the prototype).
- [x] Style the container with Tailwind for a clean, modern UI (spacing, card layout, responsive design, visual hierarchy).
- [x] Mark completed

### Task 7: Main Page Integration & User Flow Logic
- [x] Edit `app/page.js` (remove all default Next.js boilerplate)
- [x] Import `ContextSetup`, `DynamicTaskContainer`, `useSharedStateStore`, and `processWithGemini`
- [x] Read `systemContext` from the store.
- [x] Conditional rendering: `if (!systemContext)` return `<ContextSetup />`.
- [x] Else (Phase 2), render a form with a text `<textarea id="user-prompt" required>` and a submit "Invia Richiesta" button.
- [x] Attach `onSubmit` to the form: prevent default, call `setLoading(true)`, clear previous errors, call `processWithGemini(textareaValue, systemContext)`.
- [x] On promise resolution: call `updateTaskData(result)` and `setLoading(false)`.
- [x] On promise rejection: call `setError(err.message)` and `setLoading(false)`.
- [x] Render `<DynamicTaskContainer />` below the prompt form.
- [x] Mark completed

### Task 8: End-to-End & Accessibility Validation
- [x] Run: `npx playwright install --with-deps`
- [x] Create folder: `mkdir -p e2e`
- [x] Create file `e2e/user-flow.spec.js`
- [x] In `user-flow.spec.js`, write test 1: Navigate to `/`, verify ContextSetup is visible, paste text "Contesto di test", click save, verify the prompt form appears.
- [x] Write test 2: Fill `#user-prompt`, click submit. Mock the Server Action or network to return a valid `'meeting_coordination'` JSON.
- [x] Assert that `aria-live` element contains "Elaborazione in corso...".
- [x] Assert that focus is strictly moved to `#task-title` using `await expect(page.locator('#task-title')).toBeFocused()`.
- [x] Run `@axe-core/playwright` on the page while `DynamicTaskContainer` is visible and assert 0 violations.
- [x] Mark completed
