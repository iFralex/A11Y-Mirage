"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";
import path from "path";

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
  - slider: numeric range selection`;

export async function processWithGemini(userInput, systemContext, workflowState) {
  let prompt = WORKFLOW_INSTRUCTIONS + "\n\n";

  if (systemContext) {
    prompt += "System Context:\n" + systemContext + "\n\n";
  }

  if (workflowState && workflowState.steps && workflowState.steps.length > 0) {
    prompt += "Workflow History:\n";
    for (const step of workflowState.steps) {
      prompt += `Step ${step.stepNumber}: ${step.questionSummary}\n`;
      if (step.response) {
        prompt += `User Response: ${JSON.stringify(step.response)}\n`;
      }
    }
    prompt += "\n";
  }

  prompt += "User Input: " + userInput;

  let lastError;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await model.generateContent(prompt);
      return JSON.parse(response.response.text());
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
