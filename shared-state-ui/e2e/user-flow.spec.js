/**
 * End-to-end and accessibility tests using Playwright + @axe-core/playwright.
 *
 * NOTE: These tests require a Playwright-compatible browser binary.
 * In Alpine musl environments the downloaded Chromium binary is glibc-linked
 * and cannot be executed.  Set PLAYWRIGHT_BROWSER_AVAILABLE=true to run them
 * in an environment that ships a working browser (e.g. playwright Docker image).
 *
 * When PLAYWRIGHT_BROWSER_AVAILABLE is not 'true', all tests are skipped in
 * the beforeAll hook (before any browser fixtures are created) so the test
 * runner exits with code 0 (N skipped, 0 failed).
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BROWSER_AVAILABLE = process.env.PLAYWRIGHT_BROWSER_AVAILABLE === 'true';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STEP_1 = {
  taskId: 'task-001',
  taskType: 'generic',
  taskName: 'Plan a Team Trip',
  stepId: 'step-001',
  stepNumber: 1,
  estimatedRemainingSteps: 3,
  stateSummary: 'Gathering initial trip preferences.',
  inputs: [
    {
      id: 'destination',
      type: 'text_input',
      label: 'Where do you want to go?',
      placeholder: 'e.g. Rome',
      required: true,
    },
    {
      id: 'travel_type',
      type: 'select_option',
      label: 'Travel type',
      options: ['Train', 'Plane', 'Car'],
      required: true,
    },
  ],
};

const MOCK_STEP_2 = {
  taskId: 'task-001',
  taskType: 'generic',
  taskName: 'Plan a Team Trip',
  stepId: 'step-002',
  stepNumber: 2,
  estimatedRemainingSteps: 2,
  stateSummary: 'Choosing accommodation.',
  inputs: [
    {
      id: 'hotel',
      type: 'boolean_confirm',
      label: 'Do you need a hotel?',
      required: false,
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Seed Zustand persisted store via localStorage before the page loads. */
function seedZustandState(state) {
  return async (page) => {
    await page.addInitScript((s) => {
      localStorage.setItem(
        'shared-state-storage',
        JSON.stringify({ state: s, version: 0 })
      );
    }, state);
  };
}

/** Build a minimal workflow state with one step already in it. */
function workflowStateWithStep(step) {
  return {
    systemContext: 'Test context',
    taskData: null,
    workflow: {
      taskId: step.taskId,
      taskName: step.taskName,
      steps: [
        {
          stepId: step.stepId,
          stepNumber: step.stepNumber,
          stateSummary: step.stateSummary,
          inputs: step.inputs,
          response: null,
        },
      ],
    },
    currentStepIndex: 0,
    estimatedRemainingSteps: step.estimatedRemainingSteps,
  };
}

/** Build a workflow state with two steps, positioned at step index 1. */
function workflowStateWithTwoSteps(step1, step2) {
  return {
    systemContext: 'Test context',
    taskData: null,
    workflow: {
      taskId: step1.taskId,
      taskName: step1.taskName,
      steps: [
        {
          stepId: step1.stepId,
          stepNumber: step1.stepNumber,
          stateSummary: step1.stateSummary,
          inputs: step1.inputs,
          response: { destination: 'Rome', travel_type: 'Train' },
        },
        {
          stepId: step2.stepId,
          stepNumber: step2.stepNumber,
          stateSummary: step2.stateSummary,
          inputs: step2.inputs,
          response: null,
        },
      ],
    },
    currentStepIndex: 1,
    estimatedRemainingSteps: step2.estimatedRemainingSteps,
  };
}

/** Intercept server actions and return a mock step response. */
async function mockServerAction(page, mockStep, delayMs = 0) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const isServerAction =
      request.method() === 'POST' && !!request.headers()['next-action'];

    if (isServerAction) {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      // Return mock step in React Flight format (row 0 = return value)
      const body = `0:${JSON.stringify(mockStep)}\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/x-component',
        body,
      });
    } else {
      await route.continue();
    }
  });
}

// ─── Test 1: Context initialization works ─────────────────────────────────────

test.describe('Test 1: Context initialization works', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('shared-state-storage');
    });
  });

  test('shows ContextSetup on fresh load, saves context, and reveals prompt form', async ({
    page,
  }) => {
    await page.goto('/');

    // ContextSetup card must be visible
    await expect(page.getByText('Inizializzazione del Contesto')).toBeVisible();

    // Save button is disabled until text is entered
    const saveButton = page.getByRole('button', { name: 'Salva Contesto' });
    await expect(saveButton).toBeDisabled();

    // Enter context text
    await page.fill('#context-textarea', 'Contesto di test per workflow');
    await expect(saveButton).toBeEnabled();

    // Save context
    await saveButton.click();

    // Phase 2: user-prompt textarea must appear
    await expect(page.locator('#user-prompt')).toBeVisible();

    // ContextSetup should be gone
    await expect(page.getByText('Inizializzazione del Contesto')).not.toBeVisible();
  });
});

// ─── Test 2: First step generation works ──────────────────────────────────────

test.describe('Test 2: First step generation works', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Pre-seed systemContext so ContextSetup is skipped
    await seedZustandState({
      systemContext: 'Contesto pre-caricato',
      taskData: null,
      workflow: { taskId: null, taskName: '', steps: [] },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,
    })(page);
  });

  test('submitting a prompt calls server action and renders first workflow step', async ({
    page,
  }) => {
    await mockServerAction(page, MOCK_STEP_1, 300);

    await page.goto('/');

    // Verify we are on the prompt form
    await expect(page.locator('#user-prompt')).toBeVisible();

    // Fill in a prompt and submit
    await page.fill('#user-prompt', 'Plan a team trip to Rome');
    await page.click('button:has-text("Invia Richiesta")');

    // Loading aria-live region should announce processing
    await expect(page.locator('[aria-live="assertive"]')).toContainText(
      'Processing...'
    );

    // After mock resolves, the workflow step title should be visible
    await expect(page.locator('#step-title')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#step-title')).toHaveText(MOCK_STEP_1.taskName);

    // Step number and estimated remaining steps should be displayed
    await expect(page.getByText(`Step ${MOCK_STEP_1.stepNumber}`)).toBeVisible();
    await expect(
      page.getByText(`~${MOCK_STEP_1.estimatedRemainingSteps} steps remaining`)
    ).toBeVisible();

    // State summary should be visible
    await expect(page.getByText(MOCK_STEP_1.stateSummary)).toBeVisible();

    // The inputs from the step should be rendered
    await expect(page.getByLabel('Where do you want to go?')).toBeVisible();
  });
});

// ─── Test 3: Step submission generates next step ──────────────────────────────

test.describe('Test 3: Step submission generates next step', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Pre-seed with step 1 already displayed
    await seedZustandState(workflowStateWithStep(MOCK_STEP_1))(page);
  });

  test('filling inputs and submitting generates next step', async ({ page }) => {
    await mockServerAction(page, MOCK_STEP_2, 100);

    await page.goto('/');

    // Step 1 should be rendered
    await expect(page.locator('#step-title')).toBeVisible();
    await expect(page.locator('#step-title')).toHaveText(MOCK_STEP_1.taskName);

    // Fill in the text input
    await page.fill('input[id="destination"]', 'Rome');

    // Select an option for travel_type (rendered as RadioGroup, not native select)
    await page.getByLabel('Train').click();

    // Click Submit Step
    await page.click('button:has-text("Submit Step")');

    // After mock resolves, step 2 content should appear
    await expect(page.getByText(MOCK_STEP_2.stateSummary)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(`Step ${MOCK_STEP_2.stepNumber}`)).toBeVisible();
  });
});

// ─── Test 4: Previous step navigation works ───────────────────────────────────

test.describe('Test 4: Previous step navigation works', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Pre-seed with two steps, currently on step 2
    await seedZustandState(workflowStateWithTwoSteps(MOCK_STEP_1, MOCK_STEP_2))(page);
  });

  test('Previous Step button goes back to step 1, Previous disabled on first step', async ({
    page,
  }) => {
    await page.goto('/');

    // Should start on step 2
    await expect(page.getByText(MOCK_STEP_2.stateSummary)).toBeVisible();
    await expect(page.getByText(`Step ${MOCK_STEP_2.stepNumber}`)).toBeVisible();

    // Previous button should be enabled on step 2
    const prevButton = page.getByRole('button', { name: 'Previous Step' });
    await expect(prevButton).toBeEnabled();

    // Go back to step 1
    await prevButton.click();

    // Step 1 should now be displayed
    await expect(page.getByText(MOCK_STEP_1.stateSummary)).toBeVisible();
    await expect(page.getByText(`Step ${MOCK_STEP_1.stepNumber}`)).toBeVisible();

    // Previous button should now be disabled (at step index 0)
    await expect(prevButton).toBeDisabled();

    // Previously entered responses should be pre-filled
    const destInput = page.locator('input[id="destination"]');
    await expect(destInput).toBeVisible();
    await expect(destInput).toHaveValue('Rome');
  });
});

// ─── Test 5: Workflow persistence after reload ────────────────────────────────

test.describe('Test 5: Workflow persistence after reload', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Seed with step 1 active
    await seedZustandState(workflowStateWithStep(MOCK_STEP_1))(page);
  });

  test('workflow state survives a page reload', async ({ page }) => {
    await page.goto('/');

    // Confirm workflow step is shown before reload
    await expect(page.locator('#step-title')).toBeVisible();
    await expect(page.locator('#step-title')).toHaveText(MOCK_STEP_1.taskName);

    // Reload the page
    await page.reload();

    // Workflow step should still be shown after reload
    await expect(page.locator('#step-title')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#step-title')).toHaveText(MOCK_STEP_1.taskName);
    await expect(page.getByText(MOCK_STEP_1.stateSummary)).toBeVisible();

    // ContextSetup should NOT appear after reload
    await expect(page.getByText('Inizializzazione del Contesto')).not.toBeVisible();
  });

  test('Reset Workflow clears state and returns to ContextSetup', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#step-title')).toBeVisible();

    // Click Reset Workflow
    await page.click('button:has-text("Reset Workflow")');

    // Should return to ContextSetup
    await expect(page.getByText('Inizializzazione del Contesto')).toBeVisible({
      timeout: 3000,
    });
  });
});

// ─── Test 6: Accessibility validation with axe ────────────────────────────────

test.describe('Test 6: Accessibility validation with axe', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test('ContextSetup has 0 axe violations', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('shared-state-storage');
    });

    await page.goto('/');
    await expect(page.getByText('Inizializzazione del Contesto')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('Prompt form has 0 axe violations', async ({ page }) => {
    await seedZustandState({
      systemContext: 'Contesto accessibilità',
      taskData: null,
      workflow: { taskId: null, taskName: '', steps: [] },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,
    })(page);

    await page.goto('/');
    await expect(page.locator('#user-prompt')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('WorkflowStepContainer has 0 axe violations', async ({ page }) => {
    await seedZustandState(workflowStateWithStep(MOCK_STEP_1))(page);

    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('aria-live polite region announces step change', async ({ page }) => {
    await seedZustandState(workflowStateWithStep(MOCK_STEP_1))(page);

    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // The polite live region should contain the step announcement
    const politeRegion = page.locator('[aria-live="polite"]');
    await expect(politeRegion).toContainText(
      `Step ${MOCK_STEP_1.stepNumber}`,
      { timeout: 3000 }
    );
  });

  test('step heading is keyboard-focusable (tabIndex=-1)', async ({ page }) => {
    await seedZustandState(workflowStateWithStep(MOCK_STEP_1))(page);

    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // step-title should have tabIndex -1
    const tabIndex = await page.locator('#step-title').getAttribute('tabindex');
    expect(tabIndex).toBe('-1');
  });
});
