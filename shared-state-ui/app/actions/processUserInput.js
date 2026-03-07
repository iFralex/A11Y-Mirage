"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { buildConversationMemory } from "../utils/workflowHelpers";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    taskId: { type: SchemaType.STRING },
    taskType: {
      type: SchemaType.STRING,
      enum: ["generic"],
    },
    taskName: { type: SchemaType.STRING },
    stepId: { type: SchemaType.STRING },
    stepNumber: { type: SchemaType.NUMBER },
    estimatedRemainingSteps: { type: SchemaType.NUMBER },
    stateSummary: { type: SchemaType.STRING },
    inputs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          type: {
            type: SchemaType.STRING,
            enum: [
              "text_input",
              "number_input",
              "select_option",
              "multi_select",
              "boolean_confirm",
              "date_input",
              "file_upload",
              "rating",
              "slider",
            ],
          },
          label: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          placeholder: { type: SchemaType.STRING },
          required: { type: SchemaType.BOOLEAN },
        },
        required: ["id", "type", "label"],
      },
    },
    isFinalStep: { type: SchemaType.BOOLEAN },
    finalActionLabel: { type: SchemaType.STRING },
    finalSummary: { type: SchemaType.STRING },
  },
  required: [
    "taskId",
    "taskType",
    "taskName",
    "stepId",
    "stepNumber",
    "estimatedRemainingSteps",
    "stateSummary",
    "inputs",
    "isFinalStep",
  ],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema,
  },
});

const WORKFLOW_INSTRUCTIONS = `You are an AI workflow engine. Your role is to guide the user through a multi-step workflow to accomplish their goal.

For each interaction, generate the NEXT SINGLE STEP of the workflow as a structured JSON response.

Rules:
- taskType must always be "generic"
- taskName should describe the overall goal/task
- stepId should be a unique identifier (e.g. "step_1", "step_2")
- stepNumber starts at 1 and increments with each step
- estimatedRemainingSteps is your best estimate of how many more steps are needed after this one
- stateSummary summarizes what has been gathered so far and what this step aims to collect
- inputs is an array of 1-4 input fields the user must fill in this step
- Each input must have: id (unique), type (from allowed types), label (human-readable)
- For select_option and multi_select, provide options array
- Mark required: true for mandatory inputs
- Use appropriate input types:
  - text_input: free text
  - number_input: numeric values
  - select_option: single choice from list
  - multi_select: multiple choices from list
  - boolean_confirm: yes/no confirmation
  - date_input: date selection
  - file_upload: file attachment
  - rating: 1-5 star rating
  - slider: numeric range selection

Step minimisation rules (CRITICAL - follow strictly):
- Use the MINIMUM number of steps necessary to complete the task. Do not add extra steps that are not strictly required.
- Do NOT ask unnecessary follow-up questions. If information can be inferred or is already known, skip asking for it.
- Stop generating steps as soon as enough information has been collected to complete the task. Do not continue collecting data beyond what is needed.
- Complete the workflow early whenever possible. Set isFinalStep=true and estimatedRemainingSteps=0 the moment all required information is in hand.

Context awareness rules (CRITICAL - follow strictly):
- Before generating any step, extract ALL available information from the System Context and Workflow History.
- NEVER ask the user for information that is already stated in the System Context or Workflow History.
- When you know a fact from the context, reference it directly in the step question instead of asking for it again.

Example of CORRECT context usage:
  Context contains: "User is planning a 7-day trip to Rome"
  Good question: "You mentioned a 7-day trip to Rome — which dates are you considering for departure?"

Example of INCORRECT behavior (do NOT do this):
  Context contains: "User is planning a trip to Rome"
  Bad question: "Where would you like to travel?" — this asks for information already known from the context.`;

const REQUIRED_STEP_FIELDS = [
  "taskId",
  "taskType",
  "taskName",
  "stepId",
  "stepNumber",
  "estimatedRemainingSteps",
  "stateSummary",
  "inputs",
  "isFinalStep",
];

function validateStepResponse(data) {
  for (const field of REQUIRED_STEP_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`Invalid step response: missing required field "${field}"`);
    }
  }
  if (!Array.isArray(data.inputs) || data.inputs.length === 0) {
    throw new Error("Invalid step response: inputs must be a non-empty array");
  }
  if (typeof data.isFinalStep !== "boolean") {
    throw new Error("Invalid step response: isFinalStep must be a boolean");
  }
  if (data.finalActionLabel !== undefined && !data.isFinalStep) {
    throw new Error(
      "Invalid step response: finalActionLabel is only allowed when isFinalStep is true"
    );
  }
}

export async function processWithGemini(userInput, systemContext, workflowState) {
  let prompt = WORKFLOW_INSTRUCTIONS + "\n\n";

  if (systemContext) {
    prompt += "System Context:\n" + systemContext + "\n\n";
  }

  if (workflowState && workflowState.steps && workflowState.steps.length > 0) {
    const history = buildConversationMemory(workflowState.steps);
    if (history) {
      prompt += "Workflow History:\n" + history + "\n\n";
    }
  }

  prompt += "User Input: " + userInput;

  let lastError;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await model.generateContent(prompt);
      const parsed = JSON.parse(response.response.text());
      validateStepResponse(parsed);
      fs.appendFileSync(
        path.join(process.cwd(), "logs", "workflow-history.log"),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          taskId: parsed.taskId,
          stepNumber: parsed.stepNumber,
          userResponse: userInput,
          modelResponse: parsed,
        }) + "\n"
      );
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }
  fs.appendFileSync(
    path.join(process.cwd(), "logs", "gemini-errors.log"),
    JSON.stringify({ error: lastError?.message ?? String(lastError), userInput, systemContext }) + "\n"
  );
  throw new Error("Errore di connessione al modello.");
}
