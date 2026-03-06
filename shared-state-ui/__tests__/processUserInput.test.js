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
          questionSummary: "Where do you want to go?",
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
});
