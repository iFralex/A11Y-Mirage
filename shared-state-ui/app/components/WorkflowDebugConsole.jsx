'use client';

import { useState } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';

export default function WorkflowDebugConsole() {
  const workflow = useSharedStateStore((state) => state.workflow);
  const currentStepIndex = useSharedStateStore((state) => state.currentStepIndex);
  const estimatedRemainingSteps = useSharedStateStore((state) => state.estimatedRemainingSteps);
  const systemContext = useSharedStateStore((state) => state.systemContext);

  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  const currentStep = workflow.steps[currentStepIndex] ?? null;

  return (
    <div
      data-testid="debug-console"
      className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 text-xs font-mono"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-t-lg"
        aria-expanded={open}
        aria-controls="debug-panel-body"
      >
        <span>Debug Console</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div id="debug-panel-body" className="px-3 py-2 space-y-3 max-h-96 overflow-auto">
          <section>
            <h3 className="font-semibold text-zinc-500 uppercase tracking-wide mb-1">Workflow State</h3>
            <div className="space-y-0.5 text-zinc-700 dark:text-zinc-300">
              <div><span className="text-zinc-400">taskId:</span> {workflow.taskId ?? 'null'}</div>
              <div><span className="text-zinc-400">taskName:</span> {workflow.taskName || '—'}</div>
              <div><span className="text-zinc-400">steps:</span> {workflow.steps.length}</div>
              <div><span className="text-zinc-400">currentStepIndex:</span> {currentStepIndex}</div>
              <div><span className="text-zinc-400">estimatedRemaining:</span> {estimatedRemainingSteps ?? 'null'}</div>
              <div><span className="text-zinc-400">systemContext:</span> {systemContext ? systemContext.slice(0, 40) + (systemContext.length > 40 ? '…' : '') : '—'}</div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-zinc-500 uppercase tracking-wide mb-1">Step History</h3>
            {workflow.steps.length === 0 ? (
              <div className="text-zinc-400 italic">No steps yet.</div>
            ) : (
              <ol className="space-y-2 list-none">
                {workflow.steps.map((step, idx) => (
                  <li
                    key={step.stepId}
                    className={`rounded border p-2 ${idx === currentStepIndex ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                  >
                    <div className="font-semibold text-zinc-600 dark:text-zinc-300">
                      Step {step.stepNumber} {idx === currentStepIndex ? '← current' : ''}
                    </div>
                    <div><span className="text-zinc-400">stepId:</span> {step.stepId}</div>
                    <div><span className="text-zinc-400">summary:</span> {step.stateSummary || '—'}</div>
                    <div><span className="text-zinc-400">inputs:</span> {(step.inputs || []).length}</div>
                    <div>
                      <span className="text-zinc-400">response:</span>{' '}
                      {step.response ? JSON.stringify(step.response) : 'null'}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-zinc-500 uppercase tracking-wide mb-1">Current Step Inputs</h3>
            {currentStep ? (
              <ol className="space-y-1 list-none">
                {(currentStep.inputs || []).map((inp) => (
                  <li key={inp.id} className="text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-400">{inp.id}:</span> [{inp.type}] {inp.label}
                    {inp.required ? ' *' : ''}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-zinc-400 italic">No current step.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
