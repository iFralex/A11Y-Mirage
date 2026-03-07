import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
  default: {
    appendFileSync: vi.fn(),
  },
}));

// Mock @google/generative-ai
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

vi.mock("@google/generative-ai", () => {
  class GoogleGenerativeAI {
    constructor() {}
    getGenerativeModel = mockGetGenerativeModel;
  }
  return {
    GoogleGenerativeAI,
    SchemaType: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      ARRAY: "ARRAY",
      NUMBER: "NUMBER",
      BOOLEAN: "BOOLEAN",
    },
  };
});

const validStepData = {
  taskId: "task-123",
  taskType: "generic",
  taskName: "Plan a trip to Rome",
  stepId: "step_1",
  stepNumber: 1,
  estimatedRemainingSteps: 3,
  stateSummary: "Starting travel planning workflow",
  isFinalStep: false,
  inputs: [
    {
      id: "destination",
      type: "text_input",
      label: "Where do you want to go?",
      placeholder: "Enter destination",
      required: true,
    },
  ],
};

const validFinalStepData = {
  ...validStepData,
  stepId: "step_4",
  stepNumber: 4,
  estimatedRemainingSteps: 0,
  isFinalStep: true,
  finalActionLabel: "Book Trip",
  finalSummary: "You are booking a 7-day trip to Rome departing June 1st.",
};

describe("processWithGemini", () => {
  let processWithGemini;
  let fs;

  beforeAll(async () => {
    const actionModule = await import("@/app/actions/processUserInput.js");
    processWithGemini = actionModule.processWithGemini;
    fs = await import("fs");
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed JSON step on successful call", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const result = await processWithGemini("plan a trip", "You are a travel assistant");

    expect(result).toEqual(validStepData);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("You are a travel assistant");
    expect(callArg).toContain("plan a trip");
  });

  it("includes workflow history in prompt when workflowState has steps", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const workflowState = {
      steps: [
        {
          stepNumber: 1,
          stateSummary: "Where do you want to go?",
          response: { destination: "Rome" },
        },
      ],
    };

    await processWithGemini("proceed", "context", workflowState);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Workflow History");
    expect(callArg).toContain("Where do you want to go?");
    expect(callArg).toContain("Rome");
  });

  it("retries once on failure and succeeds on second attempt", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        response: { text: () => JSON.stringify(validStepData) },
      });

    const result = await processWithGemini("prompt", "ctx");

    expect(result).toEqual(validStepData);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("throws and logs error after both retries fail", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"));

    await expect(processWithGemini("prompt", "ctx")).rejects.toThrow(
      "Errore di connessione al modello."
    );
    expect(fs.default.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining("logs/gemini-errors.log"),
      expect.stringContaining("fail 2")
    );
  });

  it("retries and logs error when response is missing required field", async () => {
    const invalidData = { ...validStepData };
    delete invalidData.taskId;

    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } });

    await expect(processWithGemini("prompt", "ctx")).rejects.toThrow(
      "Errore di connessione al modello."
    );
    expect(fs.default.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining("logs/gemini-errors.log"),
      expect.stringContaining("taskId")
    );
  });

  it("retries and logs error when inputs is empty array", async () => {
    const invalidData = { ...validStepData, inputs: [] };

    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } });

    await expect(processWithGemini("prompt", "ctx")).rejects.toThrow(
      "Errore di connessione al modello."
    );
    expect(fs.default.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining("logs/gemini-errors.log"),
      expect.stringContaining("inputs")
    );
  });

  it("correctly parses a final step response with isFinalStep=true", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validFinalStepData) },
    });

    const result = await processWithGemini("confirm", "ctx");

    expect(result.isFinalStep).toBe(true);
    expect(result.finalActionLabel).toBe("Book Trip");
    expect(result.finalSummary).toBe(
      "You are booking a 7-day trip to Rome departing June 1st."
    );
  });

  it("accepts a normal step response with isFinalStep=false and no finalActionLabel", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const result = await processWithGemini("start", "ctx");

    expect(result.isFinalStep).toBe(false);
    expect(result.finalActionLabel).toBeUndefined();
    expect(result.finalSummary).toBeUndefined();
  });

  it("retries and logs error when isFinalStep is missing", async () => {
    const invalidData = { ...validStepData };
    delete invalidData.isFinalStep;

    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } });

    await expect(processWithGemini("prompt", "ctx")).rejects.toThrow(
      "Errore di connessione al modello."
    );
    expect(fs.default.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining("logs/gemini-errors.log"),
      expect.stringContaining("isFinalStep")
    );
  });

  it("prompt includes step minimisation rules to prevent infinite step generation", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("simple task", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("MINIMUM number of steps");
    expect(callArg).toContain("unnecessary follow-up questions");
    expect(callArg).toContain("Stop generating steps");
    expect(callArg).toContain("Complete the workflow early");
  });

  it("prompt includes context awareness rules to prevent re-asking known information", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("book a trip", "User is planning a 7-day trip to Rome");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("extract ALL available information from the System Context");
    expect(callArg).toContain("NEVER ask the user for information that is already stated");
    expect(callArg).toContain("reference it directly in the step question");
    expect(callArg).toContain("Example of CORRECT context usage");
    expect(callArg).toContain("Example of INCORRECT behavior");
  });

  it("prompt includes context referencing rules requiring questions to reference known context facts", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("book a flight", "User has a budget of €500 and prefers window seats");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Context referencing rules");
    expect(callArg).toContain("MUST reference the relevant facts");
    expect(callArg).toContain("improves clarity");
    expect(callArg).toContain("WEAK generic question");
    expect(callArg).toContain("IMPROVED context-referencing question");
  });

  it("prompt includes language adaptation rules to match user input language", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("Voglio prenotare un volo per Londra", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Language adaptation rules");
    expect(callArg).toContain("Detect the language of the User Input");
    expect(callArg).toContain("taskName");
    expect(callArg).toContain("stateSummary");
    expect(callArg).toContain("finalActionLabel");
    expect(callArg).toContain("Italian");
    expect(callArg).toContain("English");
  });

  it("prompt language adaptation rules cover all required user-facing fields", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("book a hotel", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("input labels");
    expect(callArg).toContain("Do NOT mix languages");
  });

  it("retries and logs error when finalActionLabel is set but isFinalStep is false", async () => {
    const invalidData = { ...validStepData, isFinalStep: false, finalActionLabel: "Done" };

    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(invalidData) } });

    await expect(processWithGemini("prompt", "ctx")).rejects.toThrow(
      "Errore di connessione al modello."
    );
    expect(fs.default.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining("logs/gemini-errors.log"),
      expect.stringContaining("finalActionLabel")
    );
  });

  it("prompt includes single-step workflow rules allowing workflows to finish in one step", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("Turn on dark mode", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Single-step workflow rules");
    expect(callArg).toContain("SINGLE STEP");
    expect(callArg).toContain("finish the workflow immediately after the first step");
    expect(callArg).toContain("isFinalStep=true");
    expect(callArg).toContain("estimatedRemainingSteps=0");
  });

  it("prompt includes a single-step workflow example with isFinalStep=true and estimatedRemainingSteps=0", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("simple task", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Example of a valid single-step workflow");
    expect(callArg).toContain("stepNumber=1, isFinalStep=true, estimatedRemainingSteps=0");
  });

  it("correctly parses a single-step workflow response with isFinalStep=true and estimatedRemainingSteps=0", async () => {
    const singleStepData = {
      ...validStepData,
      stepId: "step_1",
      stepNumber: 1,
      estimatedRemainingSteps: 0,
      isFinalStep: true,
      finalActionLabel: "Confirm",
      finalSummary: "Enable dark mode on your account.",
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(singleStepData) },
    });

    const result = await processWithGemini("Turn on dark mode", "ctx");

    expect(result.stepNumber).toBe(1);
    expect(result.isFinalStep).toBe(true);
    expect(result.estimatedRemainingSteps).toBe(0);
    expect(result.finalActionLabel).toBe("Confirm");
    expect(result.finalSummary).toBe("Enable dark mode on your account.");
  });

  it("injects userProfile into the prompt when accessibilityContext is provided", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const userProfile = {
      sensory: { vision: "low_vision", color: "high_contrast" },
      cognitive: { maxInputsPerStep: 2, requiresDecisionSupport: true, safeMode: false },
      interaction: { preferredModality: "voice", progressiveDisclosure: true },
    };

    await processWithGemini("plan a trip", "ctx", null, { userProfile });

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Adaptive Context");
    expect(callArg).toContain("User Profile:");
    expect(callArg).toContain("low_vision");
    expect(callArg).toContain("high_contrast");
    expect(callArg).toContain("requiresDecisionSupport");
  });

  it("injects cognitive load score into the prompt when telemetry is provided", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const telemetry = {
      focusSwitchesCurrentStep: 5,
      timeOnCurrentStep: 120,
      errorCount: 1,
      localCognitiveLoadScore: 8.5,
    };

    await processWithGemini("plan a trip", "ctx", null, { telemetry });

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Adaptive Context");
    expect(callArg).toContain("User's Cognitive Load Score on last step: 8.5/10");
  });

  it("injects both userProfile and telemetry when both are provided", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const userProfile = { sensory: { vision: "screen_reader" } };
    const telemetry = { localCognitiveLoadScore: 3.2 };

    await processWithGemini("task", "ctx", null, { userProfile, telemetry });

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("User Profile:");
    expect(callArg).toContain("screen_reader");
    expect(callArg).toContain("User's Cognitive Load Score on last step: 3.2/10");
  });

  it("does not inject user profile or load score when accessibilityContext is empty", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("task", "ctx", null, {});

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).not.toContain("User Profile:");
    expect(callArg).not.toContain("Cognitive Load Score on last step");
  });

  it("does not inject user profile or load score when accessibilityContext is omitted", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("task", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).not.toContain("User Profile:");
    expect(callArg).not.toContain("Cognitive Load Score on last step");
  });

  it("prompt includes adaptive accessibility rules with cognitive load threshold instruction", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    await processWithGemini("task", "ctx");

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Adaptive accessibility rules");
    expect(callArg).toContain("localCognitiveLoadScore > 6");
    expect(callArg).toContain('uiDensity to "relaxed"');
    expect(callArg).toContain("recommendedOptionId");
  });

  it("correctly parses response with new adaptive fields", async () => {
    const adaptiveStepData = {
      ...validStepData,
      recommendedOptionId: "opt_1",
      decisionExplanation: "This option is best for your needs.",
      adaptationReason: "I split this step because cognitive load was high.",
      uiDensity: "relaxed",
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(adaptiveStepData) },
    });

    const result = await processWithGemini("task", "ctx");

    expect(result.recommendedOptionId).toBe("opt_1");
    expect(result.decisionExplanation).toBe("This option is best for your needs.");
    expect(result.adaptationReason).toBe("I split this step because cognitive load was high.");
    expect(result.uiDensity).toBe("relaxed");
  });

  it("accepts response without adaptive fields (they are optional)", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validStepData) },
    });

    const result = await processWithGemini("task", "ctx");

    expect(result.recommendedOptionId).toBeUndefined();
    expect(result.decisionExplanation).toBeUndefined();
    expect(result.adaptationReason).toBeUndefined();
    expect(result.uiDensity).toBeUndefined();
  });
});
