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
    },
  };
});

const validTaskData = {
  taskId: "task-123",
  taskType: "meeting_coordination",
  stateSummary: "Meeting needs to be scheduled",
  pendingAction: {
    type: "select_option",
    question: "Which time slot works?",
    options: ["Monday 10am", "Tuesday 2pm"],
  },
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

  it("returns parsed JSON on first successful call", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validTaskData) },
    });

    const result = await processWithGemini("schedule a meeting", "context");

    expect(result).toEqual(validTaskData);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      "context\n\nUser Prompt: schedule a meeting"
    );
  });

  it("retries once on failure and succeeds on second attempt", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        response: { text: () => JSON.stringify(validTaskData) },
      });

    const result = await processWithGemini("prompt", "ctx");

    expect(result).toEqual(validTaskData);
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
