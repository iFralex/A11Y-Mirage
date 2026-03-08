/**
 * Adaptive Accessibility E2E Tests (Playwright + axe-core)
 *
 * Tests the Level 3 adaptive accessibility engine:
 *   Test 1 – Level 3 Mid-Step: Focus Tunnel activates when cognitive load spikes mid-step
 *   Test 2 – Concurrent Multimodal: Speech synthesis fires on mount, Tab cancels it, Focus Tunnel shifts
 *   Test 3 – Safe Mode: Review dialog blocks network until secondary confirmation
 *   Test 4 – Screen Reader Pipeline: axe-core 0 violations + fieldset/legend DOM structure
 *
 * NOTE: Tests require a Playwright-compatible Chromium binary.
 * Set PLAYWRIGHT_BROWSER_AVAILABLE=true to run them in an environment with a working browser.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BROWSER_AVAILABLE = process.env.PLAYWRIGHT_BROWSER_AVAILABLE === 'true';

// ─── Mock step data ───────────────────────────────────────────────────────────

const MOCK_STEP = {
  taskId: 'task-a11y-001',
  taskType: 'generic',
  taskName: 'Accessibility Test Task',
  stepId: 'a11y-step-001',
  stepNumber: 1,
  estimatedRemainingSteps: 2,
  stateSummary: 'Gathering accessibility preferences.',
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

const MOCK_NEXT_STEP = {
  taskId: 'task-a11y-001',
  taskType: 'generic',
  taskName: 'Accessibility Test Task',
  stepId: 'a11y-step-002',
  stepNumber: 2,
  estimatedRemainingSteps: 1,
  stateSummary: 'Step two loaded after safe mode confirmation.',
  inputs: [
    {
      id: 'hotel',
      type: 'boolean_confirm',
      label: 'Do you need a hotel?',
      required: false,
    },
  ],
};

// ─── Default user profile ─────────────────────────────────────────────────────

const DEFAULT_PROFILE = {
  sensory: { vision: 'default', color: 'default' },
  cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
  interaction: { preferredModality: 'visual', progressiveDisclosure: false },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Seed the Zustand persisted store via localStorage before the page loads.
 * The telemetry slice is NOT persisted, so it must be injected via window.__sharedStore.
 */
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

/** Build a workflow state with a single step and an optional user profile. */
function workflowWithStep(step, userProfile = DEFAULT_PROFILE) {
  return {
    systemContext: 'Test accessibility context',
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
    userProfile,
  };
}

/** Route handler that intercepts Next.js server actions and returns a mock step. */
async function interceptServerAction(page, mockStep, trackingObj = null) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const isServerAction =
      request.method() === 'POST' && !!request.headers()['next-action'];
    if (isServerAction) {
      if (trackingObj) trackingObj.called = true;
      const body = `0:${JSON.stringify(mockStep)}\n`;
      await route.fulfill({ status: 200, contentType: 'text/x-component', body });
    } else {
      await route.continue();
    }
  });
}

// ─── Test 1: Level 3 Mid-Step Cognitive Load Trigger ─────────────────────────

test.describe('accessibility: level 3 mid-step cognitive load trigger', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Seed with default profile: requiresDecisionSupport starts false
    await seedZustandState(workflowWithStep(MOCK_STEP, DEFAULT_PROFILE))(page);
  });

  test('Focus Tunnel activates instantly when cognitive load score exceeds 7 mid-step without page reload', async ({
    page,
  }) => {
    await page.goto('/');

    // Step must be rendered before we inject telemetry
    await expect(page.locator('#step-title')).toBeVisible();

    // Verify Focus Tunnel is NOT active initially (requiresDecisionSupport is false)
    const destinationWrapper = page.locator('[data-input-tunnel="destination"]');
    const travelTypeWrapper = page.locator('[data-input-tunnel="travel_type"]');
    await expect(destinationWrapper).not.toHaveClass(/opacity-20/);
    await expect(travelTypeWrapper).not.toHaveClass(/opacity-20/);

    // Inject a high cognitive load score via the Zustand store exposed on window.
    // This simulates the useStepTelemetry hook emitting a score of 9 mid-step.
    await page.evaluate(() => {
      if (window.__sharedStore) {
        window.__sharedStore.getState().updateTelemetry({ localCognitiveLoadScore: 9 });
      }
    });

    // The WorkflowStepContainer useEffect detects score > 7 and:
    //   - sets requiresDecisionSupport: true and safeMode: true via updateUserProfile
    //   - renders the high-load Alert
    // Assert the alert appears WITHOUT a page reload (proves mid-step adaptation)
    await expect(
      page.getByText('We noticed this step is taking longer')
    ).toBeVisible({ timeout: 3000 });

    // Now focus the first input to activate the Focus Tunnel
    await page.locator('input[id="destination"]').focus();

    // The inactive input's wrapper should be dimmed (opacity-20) – Focus Tunnel is active
    await expect(travelTypeWrapper).toHaveClass(/opacity-20/, { timeout: 2000 });

    // The focused input's wrapper must NOT be dimmed
    await expect(destinationWrapper).not.toHaveClass(/opacity-20/);
  });
});

// ─── Test 2: Concurrent Multimodal Orchestration ──────────────────────────────

test.describe('accessibility: concurrent multimodal orchestration', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Replace window.speechSynthesis with a spy before any page scripts execute
    await page.addInitScript(() => {
      window.__speechMock = { speakCount: 0, cancelCount: 0, lastText: '' };
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      window.speechSynthesis = {
        speaking: false,
        cancel() {
          window.__speechMock.cancelCount++;
        },
        speak(utterance) {
          window.__speechMock.speakCount++;
          window.__speechMock.lastText = utterance?.text || '';
        },
      };
    });

    // Seed: voice modality + Focus Tunnel active (requiresDecisionSupport: true)
    await seedZustandState(
      workflowWithStep(MOCK_STEP, {
        ...DEFAULT_PROFILE,
        cognitive: { ...DEFAULT_PROFILE.cognitive, requiresDecisionSupport: true },
        interaction: { ...DEFAULT_PROFILE.interaction, preferredModality: 'voice' },
      })
    )(page);
  });

  test('speech synthesis fires on mount with semantic text; Tab cancels it and shifts Focus Tunnel', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // Speech synthesis must be triggered on mount (preferredModality === 'voice')
    await page.waitForFunction(() => window.__speechMock.speakCount > 0, {
      timeout: 3000,
    });

    // Verify the semantic summary text contains step info
    const lastText = await page.evaluate(() => window.__speechMock.lastText);
    expect(lastText).toContain('Step 1');
    expect(lastText).toContain('Gathering accessibility preferences');

    // Capture cancel count before Tab so we can detect the increase
    const cancelBefore = await page.evaluate(() => window.__speechMock.cancelCount);

    // Press Tab – the keydown listener in WorkflowStepContainer calls cancelSpeech()
    await page.keyboard.press('Tab');

    // Cancel must have been called at least once more after Tab
    const cancelAfter = await page.evaluate(() => window.__speechMock.cancelCount);
    expect(cancelAfter).toBeGreaterThan(cancelBefore);

    // Focus Tunnel assertion: Tab moves focus to the 'destination' input.
    // requiresDecisionSupport is true, so inactive inputs must be dimmed.
    const destinationWrapper = page.locator('[data-input-tunnel="destination"]');
    const travelTypeWrapper = page.locator('[data-input-tunnel="travel_type"]');

    // The focused input (destination) should NOT be dimmed
    await expect(destinationWrapper).not.toHaveClass(/opacity-20/, { timeout: 2000 });

    // The inactive input (travel_type) should be dimmed
    await expect(travelTypeWrapper).toHaveClass(/opacity-20/, { timeout: 2000 });
  });
});

// ─── Test 3: Safe Mode Review Dialog ─────────────────────────────────────────

test.describe('accessibility: safe mode review dialog', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Seed with safeMode: true
    await seedZustandState(
      workflowWithStep(MOCK_STEP, {
        ...DEFAULT_PROFILE,
        cognitive: { ...DEFAULT_PROFILE.cognitive, safeMode: true },
      })
    )(page);
  });

  test('submitting with safeMode opens Review dialog; server action blocked until Confirm clicked', async ({
    page,
  }) => {
    const tracker = { called: false };
    await interceptServerAction(page, MOCK_NEXT_STEP, tracker);

    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // In safe mode the submit button reads "Review Choices" (not "Submit Step")
    const reviewButton = page.getByRole('button', { name: 'Review Choices' });
    await expect(reviewButton).toBeVisible();

    // Fill in all required fields so validation passes
    await page.fill('input[id="destination"]', 'Paris');
    await page.getByLabel('Train').click();

    // Click "Review Choices" – must open the confirmation dialog, NOT call server action
    await reviewButton.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Review Your Choices')).toBeVisible();

    // Dialog must show the selected values
    await expect(page.getByText('Paris')).toBeVisible();

    // Server action must NOT have fired yet
    expect(tracker.called).toBe(false);

    // Test Undo: closes dialog without triggering the server action
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });
    expect(tracker.called).toBe(false);

    // Re-open the dialog and confirm to trigger the actual submission
    await reviewButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm & Proceed' }).click();

    // Dialog must close immediately after Confirm
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });

    // Wait for the next step to appear, which proves the server action was called
    await expect(
      page.getByText(MOCK_NEXT_STEP.stateSummary)
    ).toBeVisible({ timeout: 5000 });
    expect(tracker.called).toBe(true);
  });
});

// ─── Test 5: Keyboard Only Navigation ─────────────────────────────────────────

test.describe('accessibility: keyboard only navigation', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    await seedZustandState(workflowWithStep(MOCK_STEP, DEFAULT_PROFILE))(page);
  });

  test('Keyboard Only Navigation: workflow completes with Tab, Shift+Tab, Enter, and Alt shortcuts only', async ({
    page,
  }) => {
    await interceptServerAction(page, MOCK_NEXT_STEP);

    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // ── Step 1 ────────────────────────────────────────────────────────────────
    // h2 receives programmatic focus on mount; Tab moves to the first input
    await page.keyboard.press('Tab');
    await expect(page.locator('input[id="destination"]')).toBeFocused();

    // Fill destination field using keyboard only (no mouse)
    await page.keyboard.type('Rome');
    await expect(page.locator('input[id="destination"]')).toHaveValue('Rome');

    // Tab forward to travel_type radio group and select the first option
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');

    // Shift+Tab navigates backward to destination (validates reverse tab traversal)
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('input[id="destination"]')).toBeFocused();

    // Tab forward again and re-select the radio option
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');

    // Submit via Alt+N global keyboard shortcut (no mouse click)
    await page.keyboard.press('Alt+n');

    // Step 2 must load – proving step 1 was submitted entirely via keyboard
    await expect(page.getByText(MOCK_NEXT_STEP.stateSummary)).toBeVisible({
      timeout: 5000,
    });

    // ── Step 2 ────────────────────────────────────────────────────────────────
    // Listen for the step-2 server-action request before triggering it
    const step2Request = page.waitForRequest(
      (req) => req.method() === 'POST' && !!req.headers()['next-action'],
      { timeout: 5000 }
    );

    // h2 is auto-focused on step change; Tab to hotel checkbox, Tab to Submit, Enter
    await page.keyboard.press('Tab'); // hotel checkbox (boolean_confirm, not required)
    await page.keyboard.press('Tab'); // Submit Step button
    await page.keyboard.press('Enter'); // keyboard submission (no mouse)

    // Resolved request proves step 2 was also submitted entirely via keyboard
    await step2Request;
  });
});

// ─── Test 6: Speech and Keyboard Interruption ─────────────────────────────────

test.describe('accessibility: speech and keyboard interruption', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Mock window.speechSynthesis with a spy before any page scripts execute
    await page.addInitScript(() => {
      window.__speechMock = { speakCount: 0, cancelCount: 0, lastText: '' };
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      window.speechSynthesis = {
        speaking: false,
        cancel() {
          window.speechSynthesis.speaking = false;
          window.__speechMock.cancelCount++;
        },
        speak(utterance) {
          window.speechSynthesis.speaking = true;
          window.__speechMock.speakCount++;
          window.__speechMock.lastText = utterance?.text || '';
        },
      };
    });

    // Seed: voice modality so narration fires automatically on step mount
    await seedZustandState(
      workflowWithStep(MOCK_STEP, {
        ...DEFAULT_PROFILE,
        interaction: { ...DEFAULT_PROFILE.interaction, preferredModality: 'voice' },
      })
    )(page);
  });

  test('Speech and Keyboard Interruption: Alt+R replays narration; Tab triggers cancel', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // Speech must fire on mount because preferredModality === 'voice'
    await page.waitForFunction(() => window.__speechMock.speakCount > 0, {
      timeout: 3000,
    });
    const speakCountAfterMount = await page.evaluate(
      () => window.__speechMock.speakCount
    );
    expect(speakCountAfterMount).toBeGreaterThan(0);

    // Press Alt+R – triggers SpeechController.reread(), which calls _doSpeak()
    // synchronously (no debounce), so speakCount increases immediately after press
    await page.keyboard.press('Alt+r');
    const speakCountAfterReread = await page.evaluate(
      () => window.__speechMock.speakCount
    );
    expect(speakCountAfterReread).toBeGreaterThan(speakCountAfterMount);

    // Capture cancel count before Tab
    const cancelCountBefore = await page.evaluate(
      () => window.__speechMock.cancelCount
    );

    // Tab – the keydown listener from SpeechController.registerInteractionCancellation
    // fires window.speechSynthesis.cancel() immediately on any keydown
    await page.keyboard.press('Tab');

    const cancelCountAfter = await page.evaluate(
      () => window.__speechMock.cancelCount
    );
    expect(cancelCountAfter).toBeGreaterThan(cancelCountBefore);
  });
});

// ─── Test 7: Cognitive Load Keyboard Hints ────────────────────────────────────

test.describe('accessibility: cognitive load keyboard hints', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    await seedZustandState(workflowWithStep(MOCK_STEP, DEFAULT_PROFILE))(page);
  });

  test('Cognitive Load Keyboard Hints: hints appear dynamically when localCognitiveLoadScore = 8', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // Keyboard hints must NOT be visible initially (score = 0, safeMode = false)
    await expect(page.getByText('Keyboard Shortcuts Available')).not.toBeVisible();

    // Inject a cognitive load score of 8 via the Zustand store (no page reload)
    await page.evaluate(() => {
      if (window.__sharedStore) {
        window.__sharedStore.getState().updateTelemetry({ localCognitiveLoadScore: 8 });
      }
    });

    // Keyboard hints Alert must appear dynamically (score 8 exceeds threshold 6)
    await expect(page.getByText('Keyboard Shortcuts Available')).toBeVisible({
      timeout: 3000,
    });

    // The hints alert must carry aria-live="polite" so screen readers announce it
    const hintsAlert = page
      .locator('[aria-live="polite"]')
      .filter({ hasText: 'Keyboard Shortcuts Available' });
    await expect(hintsAlert).toBeVisible();
  });
});

// ─── Test 4: Screen Reader Rendering Pipeline ─────────────────────────────────

test.describe('accessibility: screen reader rendering pipeline', () => {
  test.beforeAll(async () => {
    test.skip(!BROWSER_AVAILABLE, 'Browser not available in this environment');
  });

  test.beforeEach(async ({ page }) => {
    // Seed with vision: 'screen_reader' to activate the screen-reader DOM pipeline
    await seedZustandState(
      workflowWithStep(MOCK_STEP, {
        ...DEFAULT_PROFILE,
        sensory: { ...DEFAULT_PROFILE.sensory, vision: 'screen_reader' },
      })
    )(page);
  });

  test('screen_reader mode has 0 axe violations and uses fieldset/legend instead of generic divs', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#step-title')).toBeVisible();

    // Run the full axe-core accessibility audit
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toHaveLength(0);

    // select_option inputs must render as <fieldset> + <legend> (not generic <div>s)
    // MOCK_STEP has one select_option input (travel_type)
    const fieldsets = page.locator('fieldset');
    const fieldsetCount = await fieldsets.count();
    expect(fieldsetCount).toBeGreaterThanOrEqual(1);

    const legends = page.locator('legend');
    const legendCount = await legends.count();
    expect(legendCount).toBeGreaterThanOrEqual(1);

    // Legend must contain the question label (not suppressed by aria-hidden)
    await expect(legends.first()).toContainText('Travel type');

    // No interactive inputs should be hidden from assistive technology
    const ariaHiddenInputs = page.locator('input[aria-hidden="true"]');
    await expect(ariaHiddenInputs).toHaveCount(0);
  });
});
