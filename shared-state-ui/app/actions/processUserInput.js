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
      enum: ["meeting_coordination", "document_approval", "data_collection"],
    },
    stateSummary: { type: SchemaType.STRING },
    pendingAction: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          enum: ["select_option", "boolean_confirm", "text_input"],
        },
        question: { type: SchemaType.STRING },
        options: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["type", "question", "options"],
    },
  },
  required: ["taskId", "taskType", "stateSummary", "pendingAction"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema,
  },
});

export async function processWithGemini(userPrompt, systemContext) {
  let lastError;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await model.generateContent(
        systemContext + "\n\nUser Prompt: " + userPrompt
      );
      return JSON.parse(response.response.text());
    } catch (error) {
      lastError = error;
    }
  }
  fs.appendFileSync(
    path.join(process.cwd(), "logs", "gemini-errors.log"),
    JSON.stringify({ error: lastError?.message ?? String(lastError), userPrompt, systemContext }) + "\n"
  );
  throw new Error("Errore di connessione al modello.");
}
