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
      enum: ["generic", "accessibility_onboarding"],
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
    recommendedOptionId: { type: SchemaType.STRING },
    decisionExplanation: { type: SchemaType.STRING },
    adaptationReason: { type: SchemaType.STRING },
    uiDensity: {
      type: SchemaType.STRING,
      enum: ["compact", "standard", "relaxed"],
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
- taskType must be "generic" for normal workflows; use "accessibility_onboarding" only when the System Context explicitly requests an accessibility profile onboarding flow
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
  Bad question: "Where would you like to travel?" — this asks for information already known from the context.

Context referencing rules (CRITICAL - follow strictly):
- Every step question MUST reference the relevant facts from the System Context or Workflow History that apply to that step.
- Referencing known context in questions improves clarity: it confirms to the user that their preferences are understood, reduces misunderstandings, and avoids repetition that erodes trust.
- Do NOT generate generic, context-free questions when relevant facts are available. Always personalise each question to the known context.

Example of a WEAK generic question (do NOT do this):
  Context contains: "User has a budget of €500 and prefers window seats"
  Weak question: "What are your seating preferences?" — generic, ignores the known preference from context.

Example of an IMPROVED context-referencing question (do this instead):
  Context contains: "User has a budget of €500 and prefers window seats"
  Good question: "You prefer window seats — shall we prioritise window-seat availability within your €500 budget, or is flexibility on seat type acceptable?"

Redundant question prevention rules (CRITICAL - follow strictly):
- Definitive facts stated in the System Context or Workflow History must be treated as CONFIRMED. Do not ask the user to verify, confirm, or repeat them.
- NEVER ask the user to re-enter a value that is already explicitly stated. If the context says "budget is €300", do not ask "What is your budget?".
- When a known value is required to progress the workflow, use it directly and build the next question on top of it — do not waste a step collecting it again.

Example context with known numeric information:
  Context contains: "User wants to book 3 nights in Milan with a maximum spend of €200 per night"

Example of a FORBIDDEN redundant question (do NOT do this):
  Bad question: "How many nights would you like to stay?" — the number of nights (3) is already confirmed in the context.
  Bad question: "What is your nightly budget?" — the budget (€200/night) is already confirmed in the context.

Example of a CORRECT question that builds on the known information (do this instead):
  Good question: "For your 3-night stay in Milan (up to €200/night), which check-in date works best for you?" — uses the confirmed facts and only asks for what is genuinely unknown.

Language adaptation rules (CRITICAL - follow strictly):
- Detect the language of the User Input. If the user writes in Italian, respond in Italian. If in English, respond in English. Match the language of all user-facing text to the detected input language.
- The following fields MUST be generated in the detected language:
  - taskName
  - all step questions (input labels)
  - stateSummary
  - finalActionLabel (when present)
- Do NOT mix languages. If the user input is in Italian, every label, question, and summary must be in Italian.

Example of CORRECT language adaptation:
  User Input (Italian): "Voglio prenotare un volo per Londra"
  Correct taskName: "Prenotazione volo per Londra"
  Correct label: "Data di partenza preferita"

Example of INCORRECT behavior (do NOT do this):
  User Input (Italian): "Voglio prenotare un volo per Londra"
  Wrong taskName: "Book a flight to London" — the user wrote in Italian, so the response must also be in Italian.

Single-step workflow rules (CRITICAL - follow strictly):
- Some tasks require only a SINGLE STEP to complete. When the user's request is simple and all necessary information can be collected in one interaction, do NOT generate additional steps.
- You are allowed — and encouraged — to finish the workflow immediately after the first step if that is sufficient.
- When generating a single-step workflow, you MUST set isFinalStep=true and estimatedRemainingSteps=0 on that step.

Example of a valid single-step workflow:
  User Input: "Turn on dark mode"
  This task has only one decision to make (confirm the action).
  Correct response: stepNumber=1, isFinalStep=true, estimatedRemainingSteps=0
  The workflow ends after this single confirmation step — no further steps are needed.

State summary rules (CRITICAL - follow strictly):
- The stateSummary field MUST describe TWO things clearly:
  1. What decisions or information have already been collected in previous steps.
  2. What the CURRENT step is trying to resolve or collect.
- Keep the summary concise and readable — 1 to 3 sentences maximum. Avoid vague or generic language.
- On step 1, briefly state the goal and what this first step will collect.
- On subsequent steps, always mention what was confirmed so far before describing the current step.

Example of a WEAK unclear summary (do NOT do this):
  stateSummary: "Collecting information." — this is vague, gives no context, and does not describe progress or purpose.

Example of an IMPROVED summary that describes previous decisions (do this instead):
  Context: Step 3 of a flight booking workflow, user has confirmed destination (Rome) and travel dates (10–17 June).
  Good stateSummary: "Destination (Rome) and dates (10–17 June) confirmed. This step collects seating preference and meal options."

Adaptive accessibility rules (CRITICAL - follow strictly):
- The Adaptive Context section (when provided) contains the user's accessibility profile and real-time cognitive load score.
- Always use this data to tailor the step structure, vocabulary, and density to the user's needs.
- If localCognitiveLoadScore > 6, you MUST: set uiDensity to "relaxed", provide a recommendedOptionId pointing to the simplest or most common option, and limit inputs to at most 1 per step.
- If localCognitiveLoadScore <= 6, set uiDensity to "standard" unless the user profile explicitly warrants "compact".
- When requiresDecisionSupport is true, always populate decisionExplanation with a B1-level (simple, clear) explanation of why this step matters and what the recommended choice is.
- When you change the step structure due to adaptive conditions (e.g. splitting a step, adding guidance), set adaptationReason to explain your decision (e.g. "I split this into two steps because your cognitive load score was high.").
- If vision is "screen_reader", use simple, linear questions with no implicit visual layout cues in the labels.
- If preferredModality is "voice", keep labels short and conversational — they will be read aloud.`;


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
  if (!Array.isArray(data.inputs)) {
    throw new Error("Invalid step response: inputs must be an array");
  }
  if (!data.isFinalStep && data.inputs.length === 0) {
    throw new Error("Invalid step response: inputs must be non-empty on non-final steps");
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

export async function processWithGemini(userInput, systemContext, workflowState, accessibilityContext = {}) {
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

  const { userProfile, telemetry } = accessibilityContext;
  if (userProfile || telemetry) {
    prompt += "Adaptive Context:\n";
    if (userProfile) {
      prompt += "User Profile: " + JSON.stringify(userProfile) + "\n";
    }
    if (telemetry) {
      prompt += "User's Cognitive Load Score on last step: " + telemetry.localCognitiveLoadScore + "/10\n";
    }
    prompt += "\n";
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
    JSON.stringify({
      error: lastError?.message ?? String(lastError),
      userInputLength: userInput?.length ?? 0,
      systemContextLength: systemContext?.length ?? 0,
    }) + "\n"
  );
  throw new Error("Errore di connessione al modello.");
}
