"use client";

import { useState } from "react";
import ContextSetup from "@/app/components/ContextSetup";
import DynamicTaskContainer from "@/app/components/DynamicTaskContainer";
import { useSharedStateStore } from "@/app/store/useSharedState";
import { processWithGemini } from "@/app/actions/processUserInput";

export default function Home() {
  const { systemContext, isLoading, setLoading, clearError, updateTaskData, setError } =
    useSharedStateStore();
  const [userPrompt, setUserPrompt] = useState("");

  if (!systemContext) {
    return <ContextSetup />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const result = await processWithGemini(userPrompt, systemContext);
      updateTaskData(result);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-12 px-4">
      <main className="w-full max-w-2xl space-y-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Shared State AI
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label
            htmlFor="user-prompt"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            La tua richiesta
          </label>
          <textarea
            id="user-prompt"
            required
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="Descrivi la tua richiesta..."
          />
          <button
            type="submit"
            disabled={isLoading}
            className="self-start rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Invia Richiesta
          </button>
        </form>
        <DynamicTaskContainer />
      </main>
    </div>
  );
}
