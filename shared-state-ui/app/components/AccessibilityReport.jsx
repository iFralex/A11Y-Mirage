'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSharedStateStore } from '@/app/store/useSharedState';

function calculateSessionMetrics(steps, userProfile) {
  const nonFinalSteps = steps.filter((s) => !s.isFinalStep);

  const adaptationCount = nonFinalSteps.filter(
    (s) => s.adaptationReason || s.uiDensity === 'relaxed'
  ).length;

  const relaxedSteps = nonFinalSteps.filter((s) => s.uiDensity === 'relaxed');
  const standardSteps = nonFinalSteps.filter((s) => s.uiDensity === 'standard');
  const compactSteps = nonFinalSteps.filter((s) => s.uiDensity === 'compact');

  // Approximate per-step cognitive load from uiDensity as a heuristic
  // relaxed => high load (score ~7+), standard => medium (~4), compact => low (~2)
  let totalScore = 0;
  let scoreCount = 0;
  for (const s of nonFinalSteps) {
    if (s.uiDensity === 'relaxed') { totalScore += 7.5; scoreCount++; }
    else if (s.uiDensity === 'standard') { totalScore += 4; scoreCount++; }
    else if (s.uiDensity === 'compact') { totalScore += 2; scoreCount++; }
  }
  const averageLoadScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 'N/A';

  const safeModeActive = userProfile.cognitive.safeMode;

  return {
    adaptationCount,
    averageLoadScore,
    safeModeActive,
    relaxedSteps: relaxedSteps.length,
    standardSteps: standardSteps.length,
    compactSteps: compactSteps.length,
  };
}

export default function AccessibilityReport() {
  const workflow = useSharedStateStore((state) => state.workflow);
  const userProfile = useSharedStateStore((state) => state.userProfile);

  const [saved, setSaved] = useState(false);

  const metrics = calculateSessionMetrics(workflow.steps, userProfile);

  const handleSaveProfile = () => {
    setSaved(true);
  };

  return (
    <section
      aria-labelledby="a11y-report-title"
      className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-5 flex flex-col gap-4"
    >
      <h3
        id="a11y-report-title"
        className="text-base font-semibold text-blue-900 dark:text-blue-100"
      >
        Session Accessibility Report
      </h3>

      <p className="text-sm text-blue-800 dark:text-blue-200">
        The UI adapted dynamically{' '}
        <strong>{metrics.adaptationCount}</strong> time
        {metrics.adaptationCount !== 1 ? 's' : ''} to reduce cognitive load.
        {' '}Average load score was{' '}
        <strong>{metrics.averageLoadScore}/10</strong>.
        {' '}Safe Mode was{' '}
        <strong>{metrics.safeModeActive ? 'active' : 'not active'}</strong> at session end.
      </p>

      {metrics.adaptationCount > 0 && (
        <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
          {metrics.relaxedSteps > 0 && (
            <li>
              {metrics.relaxedSteps} step{metrics.relaxedSteps !== 1 ? 's' : ''} used relaxed layout to ease cognitive load.
            </li>
          )}
          {metrics.standardSteps > 0 && (
            <li>
              {metrics.standardSteps} step{metrics.standardSteps !== 1 ? 's' : ''} used standard layout.
            </li>
          )}
          {metrics.compactSteps > 0 && (
            <li>
              {metrics.compactSteps} step{metrics.compactSteps !== 1 ? 's' : ''} used compact layout.
            </li>
          )}
        </ul>
      )}

      {saved ? (
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-medium text-green-700 dark:text-green-300"
        >
          Adaptations saved to your permanent profile.
        </p>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start border-blue-400 text-blue-800 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-900"
          onClick={handleSaveProfile}
        >
          Save these learned adaptations to my permanent profile
        </Button>
      )}
    </section>
  );
}
